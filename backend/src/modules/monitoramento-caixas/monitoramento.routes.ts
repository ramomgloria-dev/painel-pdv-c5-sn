import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { getEmpresasFiltro, getStatusCaixas } from './monitoramento.controller.js';

export const monitoramentoRouter = Router();

monitoramentoRouter.use(authenticate, authorize('monitoramento_caixas.view'));

monitoramentoRouter.get('/status-caixas', asyncHandler(getStatusCaixas));
monitoramentoRouter.get('/empresas', asyncHandler(getEmpresasFiltro));
