import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../utils/AppError.js';
import {
  buscarUsuarios,
  concederEmpresaUsuario,
  concederPermissaoUsuario,
  obterCatalogos,
  obterDetalheUsuario,
  revogarEmpresaUsuario,
  revogarPermissaoUsuario,
} from './administracao.service.js';

const buscaSchema = z.object({
  termo: z.string().max(100).optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(50).optional().default(20),
});
const permissaoBodySchema = z.object({ permissaoId: z.coerce.number().int().positive() });
const empresaBodySchema = z.object({ nroempresa: z.coerce.number().int().positive() });
const codusuarioParamSchema = z.object({ codusuario: z.string().min(1).max(30) });
const permissaoParamSchema = z.object({ codusuario: z.string().min(1).max(30), permissaoId: z.coerce.number().int().positive() });
const empresaParamSchema = z.object({
  codusuario: z.string().min(1).max(30),
  permissaoId: z.coerce.number().int().positive(),
  nroempresa: z.coerce.number().int().positive(),
});

export async function getUsuarios(req: Request, res: Response): Promise<void> {
  const parsed = buscaSchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError('Parâmetros de busca inválidos.');
  const { termo, page, pageSize } = parsed.data;
  const resultado = await buscarUsuarios(termo, page, pageSize);
  res.json({
    usuarios: resultado.usuarios.map((u) => ({
      codusuario: u.CODUSUARIO,
      nome: u.NOME,
      totalPermissoes: u.TOTAL_PERMISSOES,
      totalEmpresas: u.TOTAL_EMPRESAS,
    })),
    total: resultado.total,
    page: resultado.page,
    pageSize: resultado.pageSize,
    totalPaginas: resultado.totalPaginas,
  });
}

export async function getCatalogos(req: Request, res: Response): Promise<void> {
  const { permissoes, empresas } = await obterCatalogos(req.user!);
  res.json({
    permissoes: permissoes.map((p) => ({ id: p.ID, chave: p.CHAVE, descricao: p.DESCRICAO, escopoEmpresa: p.ESCOPO_EMPRESA === 'S' })),
    empresas: empresas.map((e) => ({ nroempresa: e.NROEMPRESA, nomereduzido: e.NOMEREDUZIDO })),
  });
}

export async function getUsuarioDetalhe(req: Request, res: Response): Promise<void> {
  const parsed = codusuarioParamSchema.safeParse(req.params);
  if (!parsed.success) throw new ValidationError('Usuário inválido.');
  const detalhe = await obterDetalheUsuario(parsed.data.codusuario);
  res.json({
    codusuario: detalhe.codusuario,
    nome: detalhe.nome,
    permissoesConcedidas: detalhe.permissoesConcedidas,
    empresasConcedidas: detalhe.empresasConcedidas.map((e) => ({ permissaoId: e.PERMISSAO_ID, nroempresa: e.NROEMPRESA })),
  });
}

export async function postPermissao(req: Request, res: Response): Promise<void> {
  const params = codusuarioParamSchema.safeParse(req.params);
  const body = permissaoBodySchema.safeParse(req.body);
  if (!params.success || !body.success) throw new ValidationError('Dados inválidos.');
  await concederPermissaoUsuario(params.data.codusuario, body.data.permissaoId, req.user!.codusuario);
  res.status(204).send();
}

export async function deletePermissao(req: Request, res: Response): Promise<void> {
  const parsed = permissaoParamSchema.safeParse(req.params);
  if (!parsed.success) throw new ValidationError('Dados inválidos.');
  await revogarPermissaoUsuario(parsed.data.codusuario, parsed.data.permissaoId, req.user!.codusuario);
  res.status(204).send();
}

export async function postEmpresa(req: Request, res: Response): Promise<void> {
  const params = permissaoParamSchema.safeParse(req.params);
  const body = empresaBodySchema.safeParse(req.body);
  if (!params.success || !body.success) throw new ValidationError('Dados inválidos.');
  await concederEmpresaUsuario(params.data.codusuario, params.data.permissaoId, body.data.nroempresa, req.user!);
  res.status(204).send();
}

export async function deleteEmpresa(req: Request, res: Response): Promise<void> {
  const parsed = empresaParamSchema.safeParse(req.params);
  if (!parsed.success) throw new ValidationError('Dados inválidos.');
  await revogarEmpresaUsuario(parsed.data.codusuario, parsed.data.permissaoId, parsed.data.nroempresa, req.user!.codusuario);
  res.status(204).send();
}
