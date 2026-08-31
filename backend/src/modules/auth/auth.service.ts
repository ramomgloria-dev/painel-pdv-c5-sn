import bcrypt from 'bcryptjs';
import { withConnection, withTransaction } from '../../config/oracle.js';
import { env } from '../../config/env.js';
import { UnauthorizedError, ValidationError } from '../../utils/AppError.js';
import { timingSafeStringEqual } from '../../utils/timingSafeCompare.js';
import { hashToken } from '../../utils/hashToken.js';
import { logAudit } from '../audit/audit.service.js';
import { decodificarSenhaConsinco } from './decodificarSenha.js';
import {
  buscarCredencialLocal,
  buscarRefreshTokenValido,
  buscarUsuarioConsinco,
  inserirRefreshToken,
  revogarRefreshToken,
} from './auth.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

export interface LoginResult {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}

export function isAdminEnv(codusuario: string): boolean {
  return codusuario.toLowerCase() === env.ADMIN_CODUSUARIO.toLowerCase();
}

/**
 * Identidade do "admin" (acesso do desenvolvedor): não existe em NENHUMA
 * tabela do banco — vem inteiramente de env (ADMIN_CODUSUARIO/ADMIN_SENHA_HASH).
 * Único lugar do sistema que conhece essa regra. É o único jeito de virar
 * isAdmin=true — TB_USUARIOS_PERMISSOES nunca concede isso, só permissões
 * individuais de página.
 */
async function autenticarAdminEnv(codusuario: string, senhaDigitada: string): Promise<AuthenticatedUser | null> {
  const confere = await bcrypt.compare(senhaDigitada, env.ADMIN_SENHA_HASH);
  if (!confere) return null;
  return { codusuario: env.ADMIN_CODUSUARIO, nome: 'Administrador do sistema', isAdmin: true, origem: 'LOCAL' };
}

/**
 * Resolve a identidade do usuário SEM verificar senha — usado no refresh
 * (a sessão já foi provada válida pelo refresh token).
 */
async function carregarPerfilAtual(codusuario: string): Promise<AuthenticatedUser | null> {
  if (isAdminEnv(codusuario)) {
    return { codusuario: env.ADMIN_CODUSUARIO, nome: 'Administrador do sistema', isAdmin: true, origem: 'LOCAL' };
  }

  return withConnection(async (connection) => {
    const localCred = await buscarCredencialLocal(connection, codusuario);
    if (localCred) {
      return { codusuario, nome: codusuario, isAdmin: false, origem: 'LOCAL' as const };
    }

    const linhas = await buscarUsuarioConsinco(connection, codusuario);
    if (linhas.length === 0) return null;

    return { codusuario, nome: linhas[0]!.NOME, isAdmin: false, origem: 'CONSINCO' as const };
  });
}

async function autenticar(codusuario: string, senhaDigitada: string): Promise<AuthenticatedUser | null> {
  // 1) Acesso do desenvolvedor — fora do banco, sempre prioridade máxima
  // para esse codusuario específico (evita ambiguidade com qualquer outro
  // mecanismo de autenticação para o mesmo login).
  if (isAdminEnv(codusuario)) {
    return autenticarAdminEnv(codusuario, senhaDigitada);
  }

  return withConnection(async (connection) => {
    // 2) Credencial local de contingência (break-glass) para OUTRAS contas,
    // se algum dia for necessário — não concede admin, só uma identidade
    // cujas permissões vêm de TB_USUARIOS_PERMISSOES como qualquer usuário.
    const localCred = await buscarCredencialLocal(connection, codusuario);
    if (localCred) {
      const confere = await bcrypt.compare(senhaDigitada, localCred.SENHA_HASH);
      if (!confere) return null;
      return { codusuario, nome: codusuario, isAdmin: false, origem: 'LOCAL' as const };
    }

    // 3) Fluxo padrão: identidade Consinco, senha decodificada via
    // CONSINCO.STA_PKG_SEGURANCA.DECODIFICAR.
    const linhas = await buscarUsuarioConsinco(connection, codusuario);
    if (linhas.length === 0) return null;

    const usuario = linhas[0]!;
    const senhaDecodificada = await decodificarSenhaConsinco(connection, usuario.SENHA);
    // Senha do Consinco vem de terminal legado (histórico case-insensitive,
    // normalmente decodificada em maiúsculas) — comparar sem diferenciar
    // caixa evita falso negativo quando o usuário digita em minúsculo.
    if (!timingSafeStringEqual(senhaDecodificada.toUpperCase(), senhaDigitada.toUpperCase())) return null;

    return { codusuario, nome: usuario.NOME, isAdmin: false, origem: 'CONSINCO' as const };
  });
}

async function armazenarRefreshToken(codusuario: string, refreshToken: string, ctx: RequestContext): Promise<void> {
  await withTransaction(async (connection) => {
    await inserirRefreshToken(connection, {
      codusuario,
      tokenHash: hashToken(refreshToken),
      expiraEmDias: env.JWT_REFRESH_TTL_DAYS,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  });
}

export async function login(codusuarioBruto: string, senhaDigitada: string, ctx: RequestContext): Promise<LoginResult> {
  // Codusuario do Consinco é sempre cadastrado em maiúsculas (ex.: "R.CESCONETO")
  // — normaliza aqui pra aceitar o usuário digitando em qualquer caixa.
  const codusuario = codusuarioBruto.trim().toUpperCase();
  if (!codusuario || !senhaDigitada) {
    throw new ValidationError('Informe usuário e senha.');
  }

  const user = await autenticar(codusuario, senhaDigitada);

  if (!user) {
    await logAudit({ codusuario, acao: 'LOGIN', resultado: 'FALHA', ipOrigem: ctx.ip });
    throw new UnauthorizedError();
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user.codusuario);
  await armazenarRefreshToken(user.codusuario, refreshToken, ctx);

  await logAudit({ codusuario: user.codusuario, acao: 'LOGIN', resultado: 'SUCESSO', ipOrigem: ctx.ip });

  return { user, accessToken, refreshToken };
}

export async function refresh(refreshTokenBruto: string, ctx: RequestContext): Promise<LoginResult> {
  let codusuario: string;
  try {
    codusuario = verifyRefreshToken(refreshTokenBruto).sub;
  } catch {
    throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
  }

  const tokenHash = hashToken(refreshTokenBruto);

  const resultado = await withTransaction(async (connection) => {
    const tokenValido = await buscarRefreshTokenValido(connection, tokenHash);
    if (!tokenValido) return null;

    // Rotação: revoga o token usado e emite um novo — reduz o impacto de um
    // refresh token vazado/reaproveitado (replay).
    await revogarRefreshToken(connection, tokenHash);
    return true;
  });

  if (!resultado) {
    await logAudit({ codusuario, acao: 'REFRESH_TOKEN', resultado: 'FALHA', ipOrigem: ctx.ip });
    throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
  }

  const user = await carregarPerfilAtual(codusuario);
  if (!user) {
    await logAudit({ codusuario, acao: 'REFRESH_TOKEN', resultado: 'FALHA', detalhe: 'Usuário não encontrado', ipOrigem: ctx.ip });
    throw new UnauthorizedError('Sessão expirada. Faça login novamente.');
  }

  const accessToken = signAccessToken(user);
  const novoRefreshToken = signRefreshToken(user.codusuario);
  await armazenarRefreshToken(user.codusuario, novoRefreshToken, ctx);

  return { user, accessToken, refreshToken: novoRefreshToken };
}

export async function logout(refreshTokenBruto: string | undefined, ctx: RequestContext): Promise<void> {
  if (!refreshTokenBruto) return;

  const tokenHash = hashToken(refreshTokenBruto);
  let codusuario: string | null = null;
  try {
    codusuario = verifyRefreshToken(refreshTokenBruto).sub;
  } catch {
    // token já inválido/expirado — segue com o revoke idempotente mesmo assim
  }

  await withTransaction(async (connection) => {
    await revogarRefreshToken(connection, tokenHash);
  });

  await logAudit({ codusuario, acao: 'LOGOUT', resultado: 'SUCESSO', ipOrigem: ctx.ip });
}
