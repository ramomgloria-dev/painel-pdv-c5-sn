import type oracledb from 'oracledb';

export async function usuarioTemPermissaoDireta(
  connection: oracledb.Connection,
  codusuario: string,
  permissionKey: string,
): Promise<boolean> {
  const result = await connection.execute<{ TOTAL: number }>(
    `SELECT COUNT(*) AS "TOTAL"
       FROM tb_usuarios_permissoes up
       JOIN tb_permissoes p ON p.id = up.permissao_id
      WHERE up.codusuario = :codusuario
        AND p.chave = :chave`,
    { codusuario, chave: permissionKey },
  );
  return (result.rows?.[0]?.TOTAL ?? 0) > 0;
}

export async function listarTodasPermissoes(connection: oracledb.Connection): Promise<string[]> {
  const result = await connection.execute<{ CHAVE: string }>(`SELECT chave AS "CHAVE" FROM tb_permissoes`);
  return (result.rows ?? []).map((row) => row.CHAVE);
}

export async function listarPermissoesDoUsuario(connection: oracledb.Connection, codusuario: string): Promise<string[]> {
  const result = await connection.execute<{ CHAVE: string }>(
    `SELECT p.chave AS "CHAVE"
       FROM tb_usuarios_permissoes up
       JOIN tb_permissoes p ON p.id = up.permissao_id
      WHERE up.codusuario = :codusuario`,
    { codusuario },
  );
  return (result.rows ?? []).map((row) => row.CHAVE);
}

/**
 * Empresas liberadas para o usuário DENTRO de uma permissão/página
 * específica (não é mais um recorte global do usuário). Usada pelas
 * páginas que têm ESCOPO_EMPRESA='S' (ex.: Monitoramento de Caixas).
 */
export async function listarEmpresasDoUsuarioParaPermissao(
  connection: oracledb.Connection,
  codusuario: string,
  permissionKey: string,
): Promise<number[]> {
  const result = await connection.execute<{ NROEMPRESA: number }>(
    `SELECT ue.nroempresa AS "NROEMPRESA"
       FROM tb_usuarios_empresas ue
       JOIN tb_permissoes p ON p.id = ue.permissao_id
      WHERE ue.codusuario = :codusuario
        AND p.chave = :chave`,
    { codusuario, chave: permissionKey },
  );
  return (result.rows ?? []).map((row) => row.NROEMPRESA);
}
