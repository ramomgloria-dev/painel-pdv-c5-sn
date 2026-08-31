import type { Response } from 'express';
import { env } from '../../config/env.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

const baseCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict' as const,
  domain: env.COOKIE_DOMAIN,
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    path: '/',
    maxAge: 15 * 60 * 1000, // alinhado ao JWT_ACCESS_TTL (15m) — ver observação no controller
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions, path: '/' });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions, path: '/api/auth' });
}
