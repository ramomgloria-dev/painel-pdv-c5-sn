import type oracledb from 'oracledb';

export interface EmpresaFiltroRow {
  NROEMPRESA: number;
  NOMEREDUZIDO: string;
}

/**
 * Empresas disponíveis pra filtrar nesta página — mesma regra de escopo do
 * `listarStatusCaixas` (null = todas, permitidas pro ADMIN).
 */
export async function listarEmpresasFiltro(
  connection: oracledb.Connection,
  empresasPermitidas: number[] | null,
): Promise<EmpresaFiltroRow[]> {
  if (empresasPermitidas !== null && empresasPermitidas.length === 0) return [];

  if (empresasPermitidas === null) {
    const result = await connection.execute<EmpresaFiltroRow>(
      `SELECT nroempresa AS "NROEMPRESA", nomereduzido AS "NOMEREDUZIDO" FROM painelpdvc5ia.vw_empresas ORDER BY nomereduzido`,
    );
    return result.rows ?? [];
  }

  const bindNames = empresasPermitidas.map((_, i) => `:empresa${i}`);
  const binds: Record<string, number> = {};
  empresasPermitidas.forEach((nro, i) => {
    binds[`empresa${i}`] = nro;
  });

  const result = await connection.execute<EmpresaFiltroRow>(
    `SELECT nroempresa AS "NROEMPRESA", nomereduzido AS "NOMEREDUZIDO"
       FROM painelpdvc5ia.vw_empresas
      WHERE nroempresa IN (${bindNames.join(', ')})
      ORDER BY nomereduzido`,
    binds,
  );
  return result.rows ?? [];
}

export interface StatusCaixaRow {
  NROEMPRESA: number;
  NOMEREDUZIDO: string;
  NROCHECKOUT: number;
  ESPECIE: string;
  STATUS: string;
}

/**
 * `empresasPermitidas === null` significa "sem restrição" (usuário ADMIN).
 * Um array vazio significa "nenhuma empresa liberada" — retorna vazio sem
 * nem consultar o banco.
 */
export async function listarStatusCaixas(
  connection: oracledb.Connection,
  empresasPermitidas: number[] | null,
): Promise<StatusCaixaRow[]> {
  if (empresasPermitidas !== null && empresasPermitidas.length === 0) {
    return [];
  }

  const colunas = `nroempresa AS "NROEMPRESA", nomereduzido AS "NOMEREDUZIDO", nrocheckout AS "NROCHECKOUT", especie AS "ESPECIE", status AS "STATUS"`;

  if (empresasPermitidas === null) {
    const result = await connection.execute<StatusCaixaRow>(
      `SELECT ${colunas}
         FROM painelpdvc5ia.vw_monitoramento
        ORDER BY nomereduzido, nrocheckout`,
    );
    return result.rows ?? [];
  }

  const bindNames = empresasPermitidas.map((_, i) => `:empresa${i}`);
  const binds: Record<string, number> = {};
  empresasPermitidas.forEach((nro, i) => {
    binds[`empresa${i}`] = nro;
  });

  const result = await connection.execute<StatusCaixaRow>(
    `SELECT ${colunas}
       FROM painelpdvc5ia.vw_monitoramento
      WHERE nroempresa IN (${bindNames.join(', ')})
      ORDER BY nomereduzido, nrocheckout`,
    binds,
  );
  return result.rows ?? [];
}

export interface PdvRedeRow {
  NROEMPRESA: number;
  NROCHECKOUT: number;
  IP: string;
}

/**
 * IP de cada checkout, pra verificação de rede (ping) — usada só em
 * background pra montar o mapa online/offline, nunca em resposta direta de
 * API (não expor IP interno de loja pro frontend).
 */
export async function listarPdvsRede(connection: oracledb.Connection): Promise<PdvRedeRow[]> {
  const result = await connection.execute<PdvRedeRow>(
    `SELECT nroempresa AS "NROEMPRESA", nrocheckout AS "NROCHECKOUT", ip AS "IP" FROM painelpdvc5ia.vw_pdvoffline`,
  );
  return result.rows ?? [];
}
