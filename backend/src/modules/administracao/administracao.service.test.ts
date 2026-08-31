import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../utils/AppError.js';
import type { AuthenticatedUser } from '../../types/auth.js';

// Sem conexão Oracle de verdade nos testes — withConnection/withTransaction
// só executam a função recebida direto, como se já tivessem uma "conexão".
vi.mock('../../config/oracle.js', () => ({
  withConnection: (fn: (connection: unknown) => unknown) => fn({}),
  withTransaction: (fn: (connection: unknown) => unknown) => fn({}),
}));

vi.mock('../auth/auth.repository.js', () => ({
  buscarUsuarioConsinco: vi.fn().mockResolvedValue([{ NOME: 'Usuário Teste', CODUSUARIO: 'X', SENHA: 'x' }]),
}));

vi.mock('../audit/audit.service.js', () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./administracao.repository.js', () => ({
  buscarUsuariosConsinco: vi.fn(),
  listarPermissoesCatalogo: vi
    .fn()
    .mockResolvedValue([{ ID: 1, CHAVE: 'monitoramento_caixas.view', DESCRICAO: 'Monitoramento de Caixas', ESCOPO_EMPRESA: 'S' }]),
  listarEmpresas: vi.fn().mockResolvedValue([
    { NROEMPRESA: 57, NOMEREDUZIDO: 'LOJA 57' },
    { NROEMPRESA: 60, NOMEREDUZIDO: 'LOJA 60' },
    { NROEMPRESA: 99, NOMEREDUZIDO: 'LOJA 99' },
  ]),
  listarPermissoesConcedidas: vi.fn().mockResolvedValue([1]),
  listarEmpresasConcedidas: vi.fn(),
  concederPermissao: vi.fn(),
  revogarPermissao: vi.fn(),
  concederEmpresaPermissao: vi.fn().mockResolvedValue(undefined),
  revogarEmpresaPermissao: vi.fn(),
}));

const { concederEmpresaUsuario } = await import('./administracao.service.js');
const { listarEmpresasConcedidas, concederEmpresaPermissao } = await import('./administracao.repository.js');

const GESTOR_COMUM: AuthenticatedUser = { codusuario: 'R.CESCONETO', nome: 'Renan', isAdmin: false, origem: 'CONSINCO' };
const ADMIN: AuthenticatedUser = { codusuario: 'admin', nome: 'Administrador do sistema', isAdmin: true, origem: 'LOCAL' };

describe('concederEmpresaUsuario — escopo de empresas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gestor comum consegue conceder a outro usuário uma empresa que ele mesmo já tem', async () => {
    vi.mocked(listarEmpresasConcedidas).mockResolvedValueOnce([
      { PERMISSAO_ID: 1, NROEMPRESA: 57 },
      { PERMISSAO_ID: 1, NROEMPRESA: 60 },
    ]);

    await expect(concederEmpresaUsuario('OUTRO.USUARIO', 1, 57, GESTOR_COMUM)).resolves.toBeUndefined();
    expect(concederEmpresaPermissao).toHaveBeenCalledTimes(1);
  });

  it('gestor comum NÃO consegue conceder a outro usuário uma empresa que ele mesmo não tem', async () => {
    vi.mocked(listarEmpresasConcedidas).mockResolvedValueOnce([
      { PERMISSAO_ID: 1, NROEMPRESA: 57 },
      { PERMISSAO_ID: 1, NROEMPRESA: 60 },
    ]);

    await expect(concederEmpresaUsuario('OUTRO.USUARIO', 1, 99, GESTOR_COMUM)).rejects.toBeInstanceOf(ValidationError);
    expect(concederEmpresaPermissao).not.toHaveBeenCalled();
  });

  it('gestor comum NÃO consegue ampliar as próprias empresas além do que já tem', async () => {
    vi.mocked(listarEmpresasConcedidas).mockResolvedValueOnce([{ PERMISSAO_ID: 1, NROEMPRESA: 57 }]);

    await expect(concederEmpresaUsuario('R.CESCONETO', 1, 99, GESTOR_COMUM)).rejects.toBeInstanceOf(ValidationError);
    expect(concederEmpresaPermissao).not.toHaveBeenCalled();
  });

  it('ADMIN pode conceder qualquer empresa, mesmo sem tê-la pessoalmente', async () => {
    await expect(concederEmpresaUsuario('OUTRO.USUARIO', 1, 99, ADMIN)).resolves.toBeUndefined();
    expect(concederEmpresaPermissao).toHaveBeenCalledTimes(1);
    // ADMIN nem precisa consultar as próprias empresas — bypass central
    expect(listarEmpresasConcedidas).not.toHaveBeenCalled();
  });
});
