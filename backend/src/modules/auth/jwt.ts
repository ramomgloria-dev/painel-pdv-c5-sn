import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { AccessTokenPayload, AuthenticatedUser } from '../../types/auth.js';

// env.JWT_ACCESS_TTL vem do .env como string livre (ex.: "15m"); o tipo
// SignOptions['expiresIn'] do @types/jsonwebtoken exige um literal
// específico (StringValue) que não dá pra validar em tempo de compilação
// a partir de uma env var — o valor é validado em runtime pela própria lib.
const accessTokenOptions: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
const refreshTokenOptions: SignOptions = { expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d` as SignOptions['expiresIn'] };

export function signAccessToken(user: AuthenticatedUser): string {
  const payload: AccessTokenPayload = {
    sub: user.codusuario,
    nome: user.nome,
    isAdmin: user.isAdmin,
    origem: user.origem,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, accessTokenOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(codusuario: string): string {
  return jwt.sign({ sub: codusuario }, env.JWT_REFRESH_SECRET, refreshTokenOptions);
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}
