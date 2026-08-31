import { withConnection, withTransaction } from '../../config/oracle.js';
import { ValidationError } from '../../utils/AppError.js';
import { logAudit } from '../audit/audit.service.js';
import { buscarUsuarioConsinco } from '../auth/auth.repository.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import {
  buscarUsuariosConsinco,
  concederEmpresaPermissao,
  concederPermissao,
  listarEmpresas,
  listarEmpresasConcedidas,
  listarPermissoesCatalogo,
  listarPermissoesConcedidas,
  revogarEmpresaPermissao,
  revogarPermissao,
} from './administracao.repository.js';

const TAMANHO_PAGINA_PADRAO = 20;
const TAMANHO_PAGINA_MAXIMO = 50;

export async function buscarUsuarios(termo: string, pagina: number, tamanhoPagina: number) {
  const pageSize = Math.min(Math.max(tamanhoPagina || TAMANHO_PAGINA_PADRAO, 1), TAMANHO_PAGINA_MAXIMO);
  const page = Math.max(pagina || 1, 1);
  const offset = (page - 1) * pageSize;

  const { usuarios, total } = await withConnection((connection) =>
    buscarUsuariosConsinco(connection, { termo: termo.trim(), offset, pageSize }),
  );

  return { usuarios, total, page, pageSize, totalPaginas: Math.max(Math.ceil(total / pageSize), 1) };
}

/**
 * ADMIN vê o catálogo de empresas inteiro. Um gestor comum (com
 * usuarios_permissoes.manage concedida, mas sem ser ADMIN) só pode enxergar
 * — e portanto só pode conceder pra outros usuários, inclusive ele mesmo —
 * as empresas que ele próprio já tem em alguma permissão com recorte de
 * empresa. Isso evita repasse: ninguém distribui acesso a uma empresa que
 * não tem.
 */
export async function obterCatalogos(actor: AuthenticatedUser) {
  return withConnection(async (connection) => {
    const [permissoes, empresas] = await Promise.all([listarPermissoesCatalogo(connection), listarEmpresas(connection)]);

    if (actor.isAdmin) {
      return { permissoes, empresas };
    }

    const empresasDoAtor = await listarEmpresasConcedidas(connection, actor.codusuario);
    const nroempresasPermitidas = new Set(empresasDoAtor.map((e) => e.NROEMPRESA));
    return { permissoes, empresas: empresas.filter((e) => nroempresasPermitidas.has(e.NROEMPRESA)) };
  });
}

export async function obterDetalheUsuario(codusuario: string) {
  return withConnection(async (connection) => {
    const linhas = await buscarUsuarioConsinco(connection, codusuario);
    if (linhas.length === 0) {
      throw new ValidationError('Usuário não encontrado no Consinco.');
    }

    const [permissoesConcedidas, empresasConcedidas] = await Promise.all([
      listarPermissoesConcedidas(connection, codusuario),
      listarEmpresasConcedidas(connection, codusuario),
    ]);

    return {
      codusuario,
      nome: linhas[0]!.NOME,
      permissoesConcedidas,
      empresasConcedidas, // [{ PERMISSAO_ID, NROEMPRESA }]
    };
  });
}

export async function concederPermissaoUsuario(codusuario: string, permissaoId: number, atribuidoPor: string): Promise<void> {
  await withTransaction(async (connection) => {
    const linhas = await buscarUsuarioConsinco(connection, codusuario);
    if (linhas.length === 0) throw new ValidationError('Usuário não encontrado no Consinco.');

    const permissoes = await listarPermissoesCatalogo(connection);
    if (!permissoes.some((p) => p.ID === permissaoId)) throw new ValidationError('Permissão inválida.');

    await concederPermissao(connection, { codusuario, permissaoId, atribuidoPor });
  });

  await logAudit({
    codusuario: atribuidoPor,
    acao: 'CONCEDER_PERMISSAO',
    recurso: `${codusuario}:permissao=${permissaoId}`,
    resultado: 'SUCESSO',
  });
}

export async function revogarPermissaoUsuario(codusuario: string, permissaoId: number, revogadoPor: string): Promise<void> {
  await withTransaction((connection) => revogarPermissao(connection, codusuario, permissaoId));

  await logAudit({
    codusuario: revogadoPor,
    acao: 'REVOGAR_PERMISSAO',
    recurso: `${codusuario}:permissao=${permissaoId}`,
    resultado: 'SUCESSO',
  });
}

export async function concederEmpresaUsuario(
  codusuario: string,
  permissaoId: number,
  nroempresa: number,
  atribuidoPor: AuthenticatedUser,
): Promise<void> {
  await withTransaction(async (connection) => {
    const linhas = await buscarUsuarioConsinco(connection, codusuario);
    if (linhas.length === 0) throw new ValidationError('Usuário não encontrado no Consinco.');

    const [permissoes, empresas, permissoesConcedidas] = await Promise.all([
      listarPermissoesCatalogo(connection),
      listarEmpresas(connection),
      listarPermissoesConcedidas(connection, codusuario),
    ]);

    const permissao = permissoes.find((p) => p.ID === permissaoId);
    if (!permissao) throw new ValidationError('Permissão inválida.');
    if (permissao.ESCOPO_EMPRESA !== 'S') throw new ValidationError('Esta permissão não usa recorte por empresa.');
    if (!permissoesConcedidas.includes(permissaoId)) {
      throw new ValidationError('Conceda a permissão da página antes de liberar empresas nela.');
    }
    if (!empresas.some((e) => e.NROEMPRESA === nroempresa)) throw new ValidationError('Empresa inválida.');

    // Ninguém repassa acesso a uma empresa que não tem — vale até pra si
    // mesmo (não dá pra um gestor comum ampliar as próprias empresas além
    // do que já foi concedido a ele). ADMIN não tem essa restrição.
    if (!atribuidoPor.isAdmin) {
      const empresasDoAtor = await listarEmpresasConcedidas(connection, atribuidoPor.codusuario);
      const podeConceder = empresasDoAtor.some((e) => e.PERMISSAO_ID === permissaoId && e.NROEMPRESA === nroempresa);
      if (!podeConceder) {
        throw new ValidationError('Você só pode conceder, nesta página, empresas que você mesmo tem acesso.');
      }
    }

    await concederEmpresaPermissao(connection, { codusuario, permissaoId, nroempresa, atribuidoPor: atribuidoPor.codusuario });
  });

  await logAudit({
    codusuario: atribuidoPor.codusuario,
    acao: 'CONCEDER_EMPRESA',
    recurso: `${codusuario}:permissao=${permissaoId}:empresa=${nroempresa}`,
    resultado: 'SUCESSO',
  });
}

export async function revogarEmpresaUsuario(
  codusuario: string,
  permissaoId: number,
  nroempresa: number,
  revogadoPor: string,
): Promise<void> {
  await withTransaction((connection) => revogarEmpresaPermissao(connection, { codusuario, permissaoId, nroempresa }));

  await logAudit({
    codusuario: revogadoPor,
    acao: 'REVOGAR_EMPRESA',
    recurso: `${codusuario}:permissao=${permissaoId}:empresa=${nroempresa}`,
    resultado: 'SUCESSO',
  });
}
