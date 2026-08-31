import type oracledb from 'oracledb';
import OracleDb from 'oracledb';

/**
 * Decodifica a senha do Consinco chamando a função Oracle
 * CONSINCO.STA_PKG_SEGURANCA.DECODIFICAR diretamente no banco.
 *
 * Único ponto do sistema que conhece essa função — nada de reimplementar a
 * lógica de decodificação em JavaScript. O valor de entrada SEMPRE vem da
 * coluna SENHA já lida do banco (nunca de input direto do usuário), então
 * não há superfície de SQL Injection aqui; mesmo assim usamos bind variable,
 * como em qualquer chamada ao banco neste projeto.
 *
 * O valor decodificado nunca deve ser logado, devolvido ao cliente ou
 * persistido em lugar nenhum — é usado só em memória, na hora da comparação.
 */
export async function decodificarSenhaConsinco(
  connection: oracledb.Connection,
  senhaCodificada: string,
): Promise<string> {
  const result = await connection.execute<{ SENHA: string | null }>(
    `SELECT CONSINCO.STA_PKG_SEGURANCA.DECODIFICAR(:senha) AS SENHA FROM DUAL`,
    { senha: senhaCodificada },
    { outFormat: OracleDb.OUT_FORMAT_OBJECT },
  );

  return result.rows?.[0]?.SENHA ?? '';
}
