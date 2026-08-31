import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../utils/AppError.js';
import { login, logout, refresh } from './auth.service.js';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from './cookies.js';
import { resolverPermissoesDoUsuario } from '../permissions/permissions.service.js';
import type { AuthenticatedUser } from '../../types/auth.js';

const loginSchema = z.object({
  codusuario: z.string().min(1).max(30),
  senha: z.string().min(1).max(255),
});

function requestContext(req: Request) {
  return { ip: req.ip, userAgent: req.get('user-agent') ?? undefined };
}

async function userResponse(user: AuthenticatedUser) {
  const permissoes = await resolverPermissoesDoUsuario(user);
  return {
    codusuario: user.codusuario,
    nome: user.nome,
    isAdmin: user.isAdmin,
    permissoes,
  };
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Informe usuário e senha.');
  }

  const { user, accessToken, refreshToken } = await login(parsed.data.codusuario, parsed.data.senha, requestContext(req));
  setAuthCookies(res, accessToken, refreshToken);
  res.json(await userResponse(user));
}

export async function postRefresh(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    return;
  }

  const { user, accessToken, refreshToken: novoRefreshToken } = await refresh(refreshToken, requestContext(req));
  setAuthCookies(res, accessToken, novoRefreshToken);
  res.json(await userResponse(user));
}

export async function postLogout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  await logout(refreshToken, requestContext(req));
  clearAuthCookies(res);
  res.status(204).send();
}

export async function getMe(req: Request, res: Response): Promise<void> {
  // authenticate já garantiu que req.user existe nesta rota
  res.json(await userResponse(req.user!));
}

export { ACCESS_COOKIE };
