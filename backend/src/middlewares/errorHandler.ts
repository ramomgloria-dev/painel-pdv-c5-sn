import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { logger } from '../logger/index.js';

const GENERIC_MESSAGE = 'Não foi possível concluir a operação. Tente novamente em alguns instantes. Se o problema continuar, entre em contato com o suporte.';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Erro de aplicação');
    }
    res.status(err.statusCode).json({ error: err.publicMessage });
    return;
  }

  // Erro não mapeado (ex.: exceção do driver Oracle, bug inesperado):
  // nunca vaza mensagem técnica (ORA-XXXXX, stack trace) para o cliente.
  logger.error({ err, path: req.path, method: req.method }, 'Erro não tratado');
  res.status(500).json({ error: GENERIC_MESSAGE });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Recurso não encontrado.' });
}
