import type { NextFunction, Request, Response } from 'express';
import { ACCESS_COOKIE } from '../modules/auth/cookies.js';
import { verifyAccessToken } from '../modules/auth/jwt.js';

/**
 * Exige um access token válido (cookie httpOnly). Nunca aceita token via
 * header/localStorage — reduz a superfície de roubo de token via XSS.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];

  if (!token) {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      codusuario: payload.sub,
      nome: payload.nome,
      isAdmin: payload.isAdmin,
      origem: payload.origem,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}
