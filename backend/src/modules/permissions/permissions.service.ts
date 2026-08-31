import { withConnection } from '../../config/oracle.js';
import {
  listarEmpresasDoUsuarioParaPermissao,
  listarPermissoesDoUsuario,
  listarTodasPermissoes,
  usuarioTemPermissaoDireta,
} from './permissions.repository.js';

interface UsuarioParaVerificacao {
  codusuario: string;
  isAdmin: boolean;
}

/**
 * ÚNICO lugar do sistema que sabe o que significa "ser admin" pra fins de
 * autorização: quem é admin passa em qualquer verificação de permissão,
 * inclusive permissões criadas depois deste código ter sido escrito — sem
 * precisar conceder a permissão explicitamente pra ele.
 */
export async function hasPermission(user: UsuarioParaVerificacao, permissionKey: string): Promise<boolean> {
  if (user.isAdmin) return true;
  return withConnection((connection) => usuarioTemPermissaoDireta(connection, user.codusuario, permissionKey));
}

/**
 * Lista de permissões resolvidas — usada pelo frontend pra decidir o que
 * mostrar/esconder (menus, botões). A barreira de segurança de verdade
 * continua sendo `hasPermission`/`authorize` em cada endpoint.
 */
export async function resolverPermissoesDoUsuario(user: UsuarioParaVerificacao): Promise<string[]> {
  return withConnection((connection) =>
    user.isAdmin ? listarTodasPermissoes(connection) : listarPermissoesDoUsuario(connection, user.codusuario),
  );
}

/**
 * Empresas liberadas pro usuário numa permissão específica.
 * `null` = sem restrição (ADMIN enxerga tudo).
 */
export async function resolverEmpresasParaPermissao(
  user: UsuarioParaVerificacao,
  permissionKey: string,
): Promise<number[] | null> {
  if (user.isAdmin) return null;
  return withConnection((connection) => listarEmpresasDoUsuarioParaPermissao(connection, user.codusuario, permissionKey));
}
