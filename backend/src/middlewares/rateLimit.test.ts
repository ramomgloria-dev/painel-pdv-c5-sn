import { describe, expect, it } from 'vitest';
import { chaveRateLimitLogin } from './rateLimit.js';

describe('chaveRateLimitLogin', () => {
  it('gera chaves diferentes pro mesmo IP quando o usuário tentado é diferente', () => {
    const chaveA = chaveRateLimitLogin({ ip: '10.89.0.1', body: { codusuario: 'R.CESCONETO' } });
    const chaveB = chaveRateLimitLogin({ ip: '10.89.0.1', body: { codusuario: 'admin' } });
    expect(chaveA).not.toBe(chaveB);
  });

  it('gera a mesma chave pro mesmo IP e usuário, ignorando maiúsculas/minúsculas e espaços', () => {
    const chaveA = chaveRateLimitLogin({ ip: '10.89.0.1', body: { codusuario: 'R.Cesconeto' } });
    const chaveB = chaveRateLimitLogin({ ip: '10.89.0.1', body: { codusuario: '  r.cesconeto  ' } });
    expect(chaveA).toBe(chaveB);
  });

  it('gera chaves diferentes pro mesmo usuário quando o IP é diferente', () => {
    const chaveA = chaveRateLimitLogin({ ip: '10.89.0.1', body: { codusuario: 'admin' } });
    const chaveB = chaveRateLimitLogin({ ip: '10.89.0.2', body: { codusuario: 'admin' } });
    expect(chaveA).not.toBe(chaveB);
  });

  it('não quebra quando o corpo da requisição não tem codusuario (ex.: payload malformado)', () => {
    expect(() => chaveRateLimitLogin({ ip: '10.89.0.1', body: {} })).not.toThrow();
    expect(() => chaveRateLimitLogin({ ip: '10.89.0.1', body: undefined })).not.toThrow();
  });
});
