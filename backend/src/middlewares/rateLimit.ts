import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export function chaveRateLimitLogin(req: Pick<Request, 'ip' | 'body'>): string {
  const codusuario = typeof req.body?.codusuario === 'string' ? req.body.codusuario.trim().toLowerCase() : '';
  return `${req.ip}:${codusuario}`;
}

/**
 * Limita tentativas de login por IP + usuário tentado (não só por IP) —
 * é uma primeira camada de defesa contra brute force, mas por IP puro é
 * perigoso demais numa rede corporativa: várias pessoas atrás do mesmo
 * NAT/proxy aparecem com o mesmo IP pro backend, e alguém errando a senha
 * da própria conta bloquearia o login de colegas em contas completamente
 * diferentes (reproduzido de verdade em teste local: tentativas na conta
 * R.CESCONETO derrubaram o login da conta admin, mesmo IP). Combinar com
 * o codusuario evita isso, mantendo a proteção contra tentativa repetida
 * na MESMA conta.
 *
 * Funciona por processo (em memória); se o backend rodar em modo cluster
 * no futuro, trocar por um store compartilhado (ex.: Redis).
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: chaveRateLimitLogin,
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});
