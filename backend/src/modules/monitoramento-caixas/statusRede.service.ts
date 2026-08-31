import { withConnection } from '../../config/oracle.js';
import { env } from '../../config/env.js';
import { logger } from '../../logger/index.js';
import { listarPdvsRede } from './monitoramento.repository.js';
import { pingEmLotes } from './pingPdv.js';

interface StatusRedeCache {
  online: boolean;
  verificadoEm: number;
}

// Chave "nroempresa:nrocheckout" -> resultado do último ping. Fica só em
// memória de propósito — é dado de rede efêmero (se o processo reiniciar,
// volta a "sem informação" até o próximo ciclo, o que é aceitável aqui).
const cache = new Map<string, StatusRedeCache>();

// Se o último ping de um checkout for mais velho que isso, tratamos como
// "sem informação" (null) em vez de confiar num dado murcho — cobre o caso
// de o ciclo de ping ter parado de rodar por algum motivo.
const OBSOLETO_APOS_MS = () => env.PDV_PING_INTERVALO_MS * 3;

function chave(nroempresa: number, nrocheckout: number): string {
  return `${nroempresa}:${nrocheckout}`;
}

/**
 * `true`/`false` = resultado do ping mais recente, ainda válido.
 * `null` = nunca verificado, ou o dado está velho demais pra confiar.
 */
export function obterStatusRede(nroempresa: number, nrocheckout: number): boolean | null {
  const entrada = cache.get(chave(nroempresa, nrocheckout));
  if (!entrada) return null;
  if (Date.now() - entrada.verificadoEm > OBSOLETO_APOS_MS()) return null;
  return entrada.online;
}

async function executarCicloDePing(): Promise<void> {
  const inicio = Date.now();
  try {
    const pdvs = await withConnection((connection) => listarPdvsRede(connection));
    const ips = pdvs.map((p) => p.IP).filter((ip): ip is string => Boolean(ip));
    const resultadoPorIp = await pingEmLotes(ips);

    const agora = Date.now();
    for (const pdv of pdvs) {
      if (!pdv.IP) continue;
      const online = resultadoPorIp.get(pdv.IP) ?? false;
      cache.set(chave(pdv.NROEMPRESA, pdv.NROCHECKOUT), { online, verificadoEm: agora });
    }

    const totalOnline = [...resultadoPorIp.values()].filter(Boolean).length;
    logger.info(
      { total: pdvs.length, online: totalOnline, offline: pdvs.length - totalOnline, duracaoMs: Date.now() - inicio },
      'Ciclo de verificação de rede dos PDVs concluído',
    );
  } catch (err) {
    logger.error({ err }, 'Falha ao rodar o ciclo de verificação de rede dos PDVs');
  }
}

let intervaloId: ReturnType<typeof setInterval> | null = null;

/**
 * Inicia o ciclo periódico de ping. Desligado via PDV_PING_HABILITADO=false
 * em ambientes sem rota até a rede das lojas (ex.: dev local) — sem isso,
 * cada ciclo só reportaria tudo como offline à toa.
 */
export function iniciarVerificacaoRedePdvs(): void {
  if (!env.PDV_PING_HABILITADO) {
    logger.info('Verificação de rede dos PDVs desligada (PDV_PING_HABILITADO=false)');
    return;
  }
  if (intervaloId) return;

  void executarCicloDePing();
  intervaloId = setInterval(() => void executarCicloDePing(), env.PDV_PING_INTERVALO_MS);
}

export function pararVerificacaoRedePdvs(): void {
  if (intervaloId) {
    clearInterval(intervaloId);
    intervaloId = null;
  }
}
