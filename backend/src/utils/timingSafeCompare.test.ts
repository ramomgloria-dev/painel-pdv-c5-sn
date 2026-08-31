import { describe, expect, it } from 'vitest';
import { timingSafeStringEqual } from './timingSafeCompare.js';

describe('timingSafeStringEqual', () => {
  it('retorna true para strings idênticas', () => {
    expect(timingSafeStringEqual('SAOPAULO11', 'SAOPAULO11')).toBe(true);
  });

  it('retorna false para strings de mesmo tamanho mas conteúdo diferente', () => {
    expect(timingSafeStringEqual('SAOPAULO11', 'SAOPAULO22')).toBe(false);
  });

  it('retorna false para strings de tamanhos diferentes, sem lançar erro', () => {
    expect(timingSafeStringEqual('SAOPAULO11', 'SAOPAULO1')).toBe(false);
  });

  it('é sensível a maiúsculas/minúsculas (quem chama decide se normaliza antes)', () => {
    expect(timingSafeStringEqual('SAOPAULO11', 'saopaulo11')).toBe(false);
  });

  it('trata string vazia contra string vazia como igual', () => {
    expect(timingSafeStringEqual('', '')).toBe(true);
  });
});
