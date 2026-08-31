import { createHash } from 'node:crypto';

/**
 * SHA-256 do refresh token. Guardamos só o hash em REFRESH_TOKENS — um dump
 * da tabela não permite reconstituir uma sessão válida.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
