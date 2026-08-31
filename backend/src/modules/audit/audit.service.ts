import { withConnection } from '../../config/oracle.js';
import { logger } from '../../logger/index.js';

export type AuditResultado = 'SUCESSO' | 'FALHA' | 'NEGADO';

export interface AuditEvent {
  codusuario: string | null;
  acao: string;
  recurso?: string;
  resultado: AuditResultado;
  detalhe?: string;
  ipOrigem?: string;
}

/**
 * Grava um evento de auditoria (login, logout, acesso negado, ação
 * administrativa...). Nunca recebe senha/token — só metadados do evento.
 *
 * Uma falha ao gravar auditoria NÃO deve derrubar a requisição do usuário:
 * registramos no log da aplicação como fallback e seguimos em frente.
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    await withConnection(async (connection) => {
      await connection.execute(
        `INSERT INTO tb_informacaoaplicacao (codusuario, acao, recurso, resultado, detalhe, ip_origem)
         VALUES (:codusuario, :acao, :recurso, :resultado, :detalhe, :ipOrigem)`,
        {
          codusuario: event.codusuario,
          acao: event.acao,
          recurso: event.recurso ?? null,
          resultado: event.resultado,
          detalhe: event.detalhe ?? null,
          ipOrigem: event.ipOrigem ?? null,
        },
      );
      await connection.commit();
    });
  } catch (err) {
    logger.error({ err, event }, 'Falha ao gravar log de auditoria');
  }
}
