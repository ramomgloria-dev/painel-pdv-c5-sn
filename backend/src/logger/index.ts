import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Controlado por LOG_PRETTY (não por NODE_ENV): pino-pretty é uma
  // devDependency — a imagem Docker de produção não a instala. Se isso
  // dependesse de NODE_ENV, rodar o container com NODE_ENV=development por
  // engano derrubaria o processo na inicialização (módulo não encontrado).
  transport: env.LOG_PRETTY
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'senha',
      'senhaDigitada',
      'senhaDecodificada',
      '*.senha',
      '*.senhaDigitada',
      '*.senhaDecodificada',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
