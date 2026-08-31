import type oracledb from 'oracledb';

export interface UsuarioBuscaRow {
  NOME: string;
  CODUSUARIO: string;
}

export async function buscarUsuariosConsinco(
  connection: oracledb.Connection,
  params: { termo: string; offset: number; pageSize: number },
): Promise<{ usuarios: UsuarioBuscaRow[]; total: number }> {
  const filtro = params.termo
    ? `WHERE UPPER(codusuario) LIKE UPPER(:termo) || '%' OR UPPER(nome) LIKE '%' || UPPER(:termo) || '%'`
    : '';
  const binds: Record<string, string | number> = params.termo
    ? { termo: params.termo, offset: params.offset, pageSize: params.pageSize }
    : { offset: params.offset, pageSize: params.pageSize };

  const [usuarios, total] = await Promise.all([
    connection.execute<UsuarioBuscaRow>(
      `SELECT nome AS "NOME", codusuario AS "CODUSUARIO"
         FROM painelpdvc5ia.vw_usuarios
         ${filtro}
        ORDER BY nome
        OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY`,
      binds,
    ),
    connection.execute<{ TOTAL: number }>(
      `SELECT COUNT(*) AS "TOTAL" FROM painelpdvc5ia.vw_usuarios ${filtro}`,
      params.termo ? { termo: params.termo } : {},
    ),
  ]);

  return { usuarios: usuarios.rows ?? [], total: total.rows?.[0]?.TOTAL ?? 0 };
}

export interface PermissaoCatalogoRow {
  ID: number;
  CHAVE: string;
  DESCRICAO: string;
  ESCOPO_EMPRESA: 'S' | 'N';
}

export async function listarPermissoesCatalogo(connection: oracledb.Connection): Promise<PermissaoCatalogoRow[]> {
  const result = await connection.execute<PermissaoCatalogoRow>(
    `SELECT id AS "ID", chave AS "CHAVE", descricao AS "DESCRICAO", escopo_empresa AS "ESCOPO_EMPRESA"
       FROM tb_permissoes
      ORDER BY descricao`,
  );
  return result.rows ?? [];
}

export interface EmpresaCatalogoRow {
  NROEMPRESA: number;
  NOMEREDUZIDO: string;
}

export async function listarEmpresas(connection: oracledb.Connection): Promise<EmpresaCatalogoRow[]> {
  const result = await connection.execute<EmpresaCatalogoRow>(
    `SELECT nroempresa AS "NROEMPRESA", nomereduzido AS "NOMEREDUZIDO"
       FROM painelpdvc5ia.vw_empresas
      ORDER BY nomereduzido`,
  );
  return result.rows ?? [];
}

export async function listarPermissoesConcedidas(connection: oracledb.Connection, codusuario: string): Promise<number[]> {
  const result = await connection.execute<{ PERMISSAO_ID: number }>(
    `SELECT permissao_id AS "PERMISSAO_ID" FROM tb_usuarios_permissoes WHERE codusuario = :codusuario`,
    { codusuario },
  );
  return (result.rows ?? []).map((r) => r.PERMISSAO_ID);
}

export async function listarEmpresasConcedidas(
  connection: oracledb.Connection,
  codusuario: string,
): Promise<{ PERMISSAO_ID: number; NROEMPRESA: number }[]> {
  const result = await connection.execute<{ PERMISSAO_ID: number; NROEMPRESA: number }>(
    `SELECT permissao_id AS "PERMISSAO_ID", nroempresa AS "NROEMPRESA" FROM tb_usuarios_empresas WHERE codusuario = :codusuario`,
    { codusuario },
  );
  return result.rows ?? [];
}

const ORA_UNIQUE_VIOLATION = 1;

export async function concederPermissao(
  connection: oracledb.Connection,
  params: { codusuario: string; permissaoId: number; atribuidoPor: string },
): Promise<void> {
  try {
    await connection.execute(
      `INSERT INTO tb_usuarios_permissoes (codusuario, permissao_id, atribuido_por) VALUES (:codusuario, :permissaoId, :atribuidoPor)`,
      params,
    );
  } catch (err) {
    if ((err as { errorNum?: number }).errorNum !== ORA_UNIQUE_VIOLATION) throw err;
  }
}

export async function revogarPermissao(connection: oracledb.Connection, codusuario: string, permissaoId: number): Promise<void> {
  await connection.execute(`DELETE FROM tb_usuarios_permissoes WHERE codusuario = :codusuario AND permissao_id = :permissaoId`, {
    codusuario,
    permissaoId,
  });
  // empresas liberadas dentro dessa permissão perdem o sentido sem a
  // permissão concedida — remove junto, pra não acumular lixo órfão.
  await connection.execute(`DELETE FROM tb_usuarios_empresas WHERE codusuario = :codusuario AND permissao_id = :permissaoId`, {
    codusuario,
    permissaoId,
  });
}

export async function concederEmpresaPermissao(
  connection: oracledb.Connection,
  params: { codusuario: string; permissaoId: number; nroempresa: number; atribuidoPor: string },
): Promise<void> {
  try {
    await connection.execute(
      `INSERT INTO tb_usuarios_empresas (codusuario, permissao_id, nroempresa, atribuido_por)
       VALUES (:codusuario, :permissaoId, :nroempresa, :atribuidoPor)`,
      params,
    );
  } catch (err) {
    if ((err as { errorNum?: number }).errorNum !== ORA_UNIQUE_VIOLATION) throw err;
  }
}

export async function revogarEmpresaPermissao(
  connection: oracledb.Connection,
  params: { codusuario: string; permissaoId: number; nroempresa: number },
): Promise<void> {
  await connection.execute(
    `DELETE FROM tb_usuarios_empresas WHERE codusuario = :codusuario AND permissao_id = :permissaoId AND nroempresa = :nroempresa`,
    params,
  );
}
