import type { NextFunction, Request, Response } from 'express';
import { hasPermission } from '../modules/permissions/permissions.service.js';
import { logAudit } from '../modules/audit/audit.service.js';

/**
 * Bloqueia a requisição no BACKEND se o usuário autenticado não tiver a
 * permissão informada — independentemente do que o frontend mostra ou
 * esconde. Mesmo que alguém descubra a URL do endpoint manualmente, sem a
 * permissão a resposta é 403.
 */
export function authorize(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    const permitido = await hasPermission(user, permissionKey);
    if (!permitido) {
      await logAudit({
        codusuario: user.codusuario,
        acao: 'ACESSO_NEGADO',
        recurso: permissionKey,
        resultado: 'NEGADO',
        ipOrigem: req.ip,
      });
      res.status(403).json({ error: 'Você não tem permissão para acessar este recurso.' });
      return;
    }

    next();
  };
}
