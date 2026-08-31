import { describe, expect, it } from 'vitest';
import { env } from '../../config/env.js';
import { isAdminEnv, login } from './auth.service.js';
import { ValidationError } from '../../utils/AppError.js';

describe('isAdminEnv', () => {
  it('reconhece o admin independente de maiúsculas/minúsculas', () => {
    expect(isAdminEnv(env.ADMIN_CODUSUARIO.toUpperCase())).toBe(true);
    expect(isAdminEnv(env.ADMIN_CODUSUARIO.toLowerCase())).toBe(true);
  });

  it('não reconhece um usuário diferente do admin', () => {
    expect(isAdminEnv(`${env.ADMIN_CODUSUARIO}_X`)).toBe(false);
  });
});

describe('login — validação de entrada', () => {
  it('rejeita usuário vazio antes de consultar qualquer coisa', async () => {
    await expect(login('', 'qualquersenha', {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita senha vazia antes de consultar qualquer coisa', async () => {
    await expect(login('ALGUEM', '', {})).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejeita usuário só com espaços', async () => {
    await expect(login('   ', 'qualquersenha', {})).rejects.toBeInstanceOf(ValidationError);
  });
});
