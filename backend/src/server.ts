import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './logger/index.js';
import { closeOraclePool, initOraclePool } from './config/oracle.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { monitoramentoRouter } from './modules/monitoramento-caixas/monitoramento.routes.js';
import { administracaoRouter } from './modules/administracao/administracao.routes.js';
import { iniciarVerificacaoRedePdvs, pararVerificacaoRedePdvs } from './modules/monitoramento-caixas/statusRede.service.js';

const app = express();

// Necessário para req.ip refletir o cliente real quando atrás de um proxy
// reverso (nginx) — sem isso, rate limiting e auditoria registrariam o IP
// do proxy para todo mundo.
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(
  pinoHttp({
    logger,
    redact: ['req.headers.cookie', 'req.headers.authorization'],
    autoLogging: { ignore: (req) => req.url === '/health' },
  }),
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/monitoramento-caixas', monitoramentoRouter);
app.use('/api/administracao', administracaoRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  await initOraclePool();
  iniciarVerificacaoRedePdvs();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Painel PDV C5 SN — backend iniciado');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Encerrando servidor...');
    pararVerificacaoRedePdvs();
    server.close();
    await closeOraclePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((err) => {
  logger.fatal({ err }, 'Falha ao iniciar o servidor');
  process.exit(1);
});
