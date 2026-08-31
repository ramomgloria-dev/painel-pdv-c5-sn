import { execFile } from 'node:child_process';
import { env } from '../../config/env.js';

/**
 * Testa se um IP responde a ping. Usa o `ping` do sistema (via execFile,
 * nunca interpolando o IP numa shell — mesmo o IP vindo só do banco, não de
 * input de usuário, evita qualquer risco de injeção de comando).
 * Roda dentro do container Linux (Alpine/busybox) sempre — não depende do
 * SO de onde o Node em si está hospedado.
 */
export function pingHost(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('ping', ['-c', '1', '-W', String(env.PDV_PING_TIMEOUT_S), ip], (error) => {
      resolve(!error);
    });
  });
}

/**
 * Roda pings em paralelo com um limite de concorrência (PDV_PING_CONCORRENCIA)
 * — pingar os ~1300 PDVs todos de uma vez abriria processos demais ao mesmo
 * tempo.
 */
export async function pingEmLotes(ips: string[], concorrencia = env.PDV_PING_CONCORRENCIA): Promise<Map<string, boolean>> {
  const resultado = new Map<string, boolean>();
  let indice = 0;

  async function worker() {
    while (indice < ips.length) {
      const meuIndice = indice++;
      const ip = ips[meuIndice]!;
      resultado.set(ip, await pingHost(ip));
    }
  }

  await Promise.all(Array.from({ length: Math.min(concorrencia, ips.length) }, worker));
  return resultado;
}
