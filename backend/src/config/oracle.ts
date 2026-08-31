import oracledb from 'oracledb';
import { env } from './env.js';
import { logger } from '../logger/index.js';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = false;
oracledb.fetchAsString = [oracledb.CLOB];

let poolPromise: Promise<oracledb.Pool> | null = null;

export function initOraclePool(): Promise<oracledb.Pool> {
  if (!poolPromise) {
    poolPromise = oracledb
      .createPool({
        user: env.ORACLE_USER,
        password: env.ORACLE_PASSWORD,
        connectString: env.ORACLE_CONNECTION_STRING,
        poolMin: env.ORACLE_POOL_MIN,
        poolMax: env.ORACLE_POOL_MAX,
        poolTimeout: 60,
        queueTimeout: 15_000,
      })
      .then((pool) => {
        logger.info({ poolMin: env.ORACLE_POOL_MIN, poolMax: env.ORACLE_POOL_MAX }, 'Pool Oracle inicializado');
        return pool;
      });
  }
  return poolPromise;
}

export async function closeOraclePool(): Promise<void> {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close(10);
    poolPromise = null;
  }
}

/**
 * Executa `fn` com uma conexão emprestada do pool, garantindo que ela volte
 * ao pool mesmo em caso de erro. Todo acesso a Oracle no app deve passar por
 * aqui — nunca abrir conexão solta em um módulo.
 */
export async function withConnection<T>(fn: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
  const pool = await initOraclePool();
  const connection = await pool.getConnection();
  try {
    connection.callTimeout = env.ORACLE_QUERY_TIMEOUT_MS;
    return await fn(connection);
  } finally {
    try {
      await connection.close();
    } catch (closeError) {
      logger.warn({ err: closeError }, 'Falha ao devolver conexão Oracle ao pool');
    }
  }
}

/**
 * Mesmo que withConnection, mas dentro de uma transação explícita: em caso de
 * erro faz rollback, em caso de sucesso faz commit. Use quando `fn` fizer
 * mais de uma escrita que precise ser atômica.
 */
export async function withTransaction<T>(fn: (connection: oracledb.Connection) => Promise<T>): Promise<T> {
  return withConnection(async (connection) => {
    try {
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });
}
