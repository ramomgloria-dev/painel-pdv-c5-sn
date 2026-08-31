import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 não encaminha rejeições de Promise para o errorHandler
 * automaticamente — todo controller async passa por aqui para garantir que
 * um erro (inclusive AppError) chegue no middleware de erro central.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
