import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import {
  deleteEmpresa,
  deletePermissao,
  getCatalogos,
  getUsuarioDetalhe,
  getUsuarios,
  postEmpresa,
  postPermissao,
} from './administracao.controller.js';

export const administracaoRouter = Router();

// Toda a administração de permissões exige a mesma permissão — só ADMIN a
// tem por padrão (bypass central), até que alguém conceda essa chave pra
// outro usuário pelo próprio painel.
administracaoRouter.use(authenticate, authorize('usuarios_permissoes.manage'));

administracaoRouter.get('/usuarios', asyncHandler(getUsuarios));
administracaoRouter.get('/usuarios/:codusuario', asyncHandler(getUsuarioDetalhe));
administracaoRouter.post('/usuarios/:codusuario/permissoes', asyncHandler(postPermissao));
administracaoRouter.delete('/usuarios/:codusuario/permissoes/:permissaoId', asyncHandler(deletePermissao));
administracaoRouter.post('/usuarios/:codusuario/permissoes/:permissaoId/empresas', asyncHandler(postEmpresa));
administracaoRouter.delete('/usuarios/:codusuario/permissoes/:permissaoId/empresas/:nroempresa', asyncHandler(deleteEmpresa));
administracaoRouter.get('/catalogos', asyncHandler(getCatalogos));
