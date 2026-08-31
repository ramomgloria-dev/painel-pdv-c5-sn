import type oracledb from 'oracledb';

export interface UsuarioConsincoRow {
  NOME: string;
  CODUSUARIO: string;
  SENHA: string;
}

export interface LocalAdminRow {
  CODUSUARIO: string;
  SENHA_HASH: string;
  ATIVO: 'S' | 'N';
}

/**
 * Busca o usuário em PAINELPDVC5IA.VW_USUARIOS. A view não tem mais
 * NROEMPRESA — empresa liberada é controlada por TB_USUARIOS_EMPRESAS.
 * Continua podendo retornar mais de uma linha em tese; tratamos isso de
 * forma defensiva usando sempre a primeira.
 */
export async function buscarUsuarioConsinco(
  connection: oracledb.Connection,
  codusuario: string,
): Promise<UsuarioConsincoRow[]> {
  const result = await connection.execute<UsuarioConsincoRow>(
    `SELECT nome AS "NOME", codusuario AS "CODUSUARIO", senha AS "SENHA"
       FROM painelpdvc5ia.vw_usuarios
      WHERE codusuario = :codusuario`,
    { codusuario },
  );
  return result.rows ?? [];
}

export async function buscarCredencialLocal(
  connection: oracledb.Connection,
  codusuario: string,
): Promise<LocalAdminRow | null> {
  const result = await connection.execute<LocalAdminRow>(
    `SELECT codusuario AS "CODUSUARIO", senha_hash AS "SENHA_HASH", ativo AS "ATIVO"
       FROM tb_local_admin_credencial
      WHERE codusuario = :codusuario
        AND ativo = 'S'`,
    { codusuario },
  );
  return result.rows?.[0] ?? null;
}

export async function inserirRefreshToken(
  connection: oracledb.Connection,
  params: { codusuario: string; tokenHash: string; expiraEmDias: number; ip?: string; userAgent?: string },
): Promise<void> {
  await connection.execute(
    `INSERT INTO tb_tokens_refresh (codusuario, token_hash, expira_em, ip_origem, user_agent)
     VALUES (:codusuario, :tokenHash, SYSTIMESTAMP + :dias, :ip, :userAgent)`,
    {
      codusuario: params.codusuario,
      tokenHash: params.tokenHash,
      dias: params.expiraEmDias,
      ip: params.ip ?? null,
      userAgent: params.userAgent?.slice(0, 255) ?? null,
    },
  );
}

export interface RefreshTokenRow {
  CODUSUARIO: string;
}

export async function buscarRefreshTokenValido(
  connection: oracledb.Connection,
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const result = await connection.execute<RefreshTokenRow>(
    `SELECT codusuario AS "CODUSUARIO"
       FROM tb_tokens_refresh
      WHERE token_hash = :tokenHash
        AND revogado_em IS NULL
        AND expira_em > SYSTIMESTAMP`,
    { tokenHash },
  );
  return result.rows?.[0] ?? null;
}

export async function revogarRefreshToken(connection: oracledb.Connection, tokenHash: string): Promise<void> {
  await connection.execute(
    `UPDATE tb_tokens_refresh SET revogado_em = SYSTIMESTAMP WHERE token_hash = :tokenHash AND revogado_em IS NULL`,
    { tokenHash },
  );
}
