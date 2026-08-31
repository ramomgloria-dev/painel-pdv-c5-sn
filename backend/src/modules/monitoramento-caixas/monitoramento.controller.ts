import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../utils/AppError.js';
import { obterEmpresasFiltro, obterStatusCaixas } from './monitoramento.service.js';

const listaDeIds = z
  .string()
  .optional()
  .transform((valor) => {
    if (!valor) return undefined;
    const ids = valor
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return ids.length > 0 ? ids : undefined;
  });

const querySchema = z.object({ empresas: listaDeIds });

export async function getStatusCaixas(req: Request, res: Response): Promise<void> {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ValidationError('Filtro inválido.');
  }

  const caixas = await obterStatusCaixas(req.user!, parsed.data.empresas);

  res.json({
    atualizadoEm: new Date().toISOString(),
    caixas: caixas.map((c) => ({
      nroempresa: c.NROEMPRESA,
      nomereduzido: c.NOMEREDUZIDO,
      nrocheckout: c.NROCHECKOUT,
      especie: c.ESPECIE,
      status: c.STATUS,
    })),
  });
}

export async function getEmpresasFiltro(req: Request, res: Response): Promise<void> {
  const empresas = await obterEmpresasFiltro(req.user!);
  res.json({ empresas: empresas.map((e) => ({ nroempresa: e.NROEMPRESA, nomereduzido: e.NOMEREDUZIDO })) });
}
