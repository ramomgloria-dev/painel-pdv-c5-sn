import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, X } from 'lucide-react';
import { APP_VERSAO, CHANGELOG } from '../../theme/version';

const CHAVE_ULTIMA_VERSAO_VISTA = 'ultima_versao_vista';

/**
 * Mostra as novidades da versão atual na primeira visita depois de um
 * deploy (compara com a última versão vista salva no localStorage do
 * navegador) e também pode ser reaberto manualmente a qualquer momento
 * (ver Header.tsx). Mesma ideia do WhatsNewModal do coletor-app, adaptada
 * pra web — sem depender de nenhuma tabela no banco.
 */
export interface UseNovidadesModalResult {
  aberto: boolean;
  fechar: () => void;
  abrirManualmente: () => void;
}

export function useNovidadesModal(): UseNovidadesModalResult {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    let ultimaVersaoVista: string | null = null;
    try {
      ultimaVersaoVista = localStorage.getItem(CHAVE_ULTIMA_VERSAO_VISTA);
    } catch {
      /* localStorage indisponível (aba privada, etc.) — só não auto-abre */
    }
    if (ultimaVersaoVista !== APP_VERSAO) setAberto(true);
  }, []);

  function fechar() {
    setAberto(false);
    try {
      localStorage.setItem(CHAVE_ULTIMA_VERSAO_VISTA, APP_VERSAO);
    } catch {
      /* sem persistência — só volta a abrir na próxima visita, sem problema */
    }
  }

  function abrirManualmente() {
    setAberto(true);
  }

  return { aberto, fechar, abrirManualmente };
}

export function NovidadesModal({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const [historicoAberto, setHistoricoAberto] = useState(false);

  if (!aberto) return null;

  const entrada = CHANGELOG[APP_VERSAO];
  const versoesAnteriores = Object.entries(CHANGELOG).filter(([versao]) => versao !== APP_VERSAO);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onFechar}>
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-ink-muted">Versão {APP_VERSAO}</p>
              <h2 className="text-base font-semibold text-ink">{entrada?.label ?? 'Novidades'}</h2>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {entrada && (
          <ul className="flex flex-col gap-2">
            {entrada.itens.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {versoesAnteriores.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setHistoricoAberto((v) => !v)}
              className="flex items-center gap-1.5 self-start text-xs font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {historicoAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {historicoAberto ? 'Ocultar' : 'Ver'} histórico de versões anteriores
            </button>

            {historicoAberto && (
              <div className="flex max-h-56 flex-col gap-3 overflow-y-auto pr-1">
                {versoesAnteriores.map(([versao, entradaAnterior]) => (
                  <div key={versao} className="flex flex-col gap-1.5">
                    <p className="text-xs font-semibold text-ink-muted">
                      Versão {versao} — {entradaAnterior.label}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {entradaAnterior.itens.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-ink-muted">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-ink-muted/50" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onFechar}
          className="mt-1 self-end rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
