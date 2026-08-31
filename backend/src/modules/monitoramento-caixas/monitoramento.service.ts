import { withConnection } from '../../config/oracle.js';
import { ForbiddenError } from '../../utils/AppError.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { resolverEmpresasParaPermissao } from '../permissions/permissions.service.js';
import { listarEmpresasFiltro, listarStatusCaixas, type StatusCaixaRow } from './monitoramento.repository.js';
import { obterStatusRede } from './statusRede.service.js';

const PERMISSAO = 'monitoramento_caixas.view';

export interface StatusCaixaComRede extends StatusCaixaRow {
  ONLINE: boolean | null;
}

function anotarStatusRede(caixas: StatusCaixaRow[]): StatusCaixaComRede[] {
  return caixas.map((c) => ({ ...c, ONLINE: obterStatusRede(c.NROEMPRESA, c.NROCHECKOUT) }));
}

/**
 * Escopo de empresas do usuário NESTA página especificamente (concedido
 * pela Gestão de Permissões, tabela TB_USUARIOS_EMPRESAS por permissão).
 * ADMIN enxerga tudo. Evita que alguém troque o parâmetro `empresas` na
 * URL/API e veja o caixa de uma loja que não é dele (IDOR).
 */
export async function obterStatusCaixas(user: AuthenticatedUser, filtroEmpresas?: number[]): Promise<StatusCaixaComRede[]> {
  const empresasPermitidas = await resolverEmpresasParaPermissao(user, PERMISSAO);

  if (filtroEmpresas && filtroEmpresas.length > 0) {
    if (empresasPermitidas !== null) {
      const naoPermitida = filtroEmpresas.find((id) => !empresasPermitidas.includes(id));
      if (naoPermitida !== undefined) {
        throw new ForbiddenError('Você não tem acesso às informações desta empresa.');
      }
    }
    const caixas = await withConnection((connection) => listarStatusCaixas(connection, filtroEmpresas));
    return anotarStatusRede(caixas);
  }

  const caixas = await withConnection((connection) => listarStatusCaixas(connection, empresasPermitidas));
  return anotarStatusRede(caixas);
}

export async function obterEmpresasFiltro(user: AuthenticatedUser) {
  const empresasPermitidas = await resolverEmpresasParaPermissao(user, PERMISSAO);
  return withConnection((connection) => listarEmpresasFiltro(connection, empresasPermitidas));
}
