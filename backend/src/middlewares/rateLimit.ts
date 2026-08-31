import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/**
 * Limita tentativas de login por IP. É uma primeira camada de defesa contra
 * brute force — funciona por processo (em memória); se o backend rodar em
 * modo cluster no futuro, trocar por um store compartilhado (ex.: Redis).
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_MS,
  limit: env.RATE_LIMIT_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' },
});
