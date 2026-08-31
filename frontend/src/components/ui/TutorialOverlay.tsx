import { useEffect, useRef, useState } from 'react';
import type { PassoTutorial } from '../../hooks/useTutorial';

interface TutorialOverlayProps {
  ativo: boolean;
  passo: PassoTutorial | undefined;
  passoAtual: number;
  passoTotal: number;
  onProximo: () => void;
  onAnterior: () => void;
  onPular: () => void;
}

/**
 * Destaque tipo "spotlight" ao redor do elemento alvo de cada passo, com um
 * balão de explicação ao lado. Reaproveita a mesma ideia do tooltip da
 * grade de caixas (medir a posição real e não deixar cortar na tela) —
 * aqui o limite é a janela inteira, porque esse overlay já fica acima de
 * tudo (inclusive da sidebar), diferente do tooltip da grade.
 */
export function TutorialOverlay({ ativo, passo, passoAtual, passoTotal, onProximo, onAnterior, onPular }: TutorialOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const [deslocamentoX, setDeslocamentoX] = useState(0);

  useEffect(() => {
    if (!ativo || !passo) {
      setRect(null);
      return;
    }

    let cancelado = false;
    function medir() {
      const alvo = document.querySelector(passo!.alvoSelector);
      if (!alvo) {
        setRect(null);
        return;
      }
      alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => {
        if (!cancelado) setRect(alvo.getBoundingClientRect());
      }, 350);
    }

    medir();
    window.addEventListener('resize', medir);
    return () => {
      cancelado = true;
      window.removeEventListener('resize', medir);
    };
  }, [ativo, passo]);

  useEffect(() => {
    if (!rect || !calloutRef.current) return;
    const MARGEM = 12;
    const largura = calloutRef.current.offsetWidth;
    const centro = rect.left + rect.width / 2;
    let ajuste = 0;
    if (centro - largura / 2 < MARGEM) {
      ajuste = MARGEM - (centro - largura / 2);
    } else if (centro + largura / 2 > window.innerWidth - MARGEM) {
      ajuste = window.innerWidth - MARGEM - (centro + largura / 2);
    }
    setDeslocamentoX(ajuste);
  }, [rect]);

  if (!ativo || !passo) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl transition-all duration-200"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 17, 21, 0.6)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-ink/60" />
      )}

      {rect && (
        <div
          ref={calloutRef}
          className="absolute flex w-72 flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl"
          style={{
            top: rect.bottom + 16,
            left: rect.left + rect.width / 2,
            transform: `translateX(calc(-50% + ${deslocamentoX}px))`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-muted">
              {passoAtual + 1} de {passoTotal}
            </span>
            <button onClick={onPular} className="text-xs text-ink-muted transition-colors hover:text-ink" aria-label="Pular tutorial">
              Pular
            </button>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">{passo.titulo}</h3>
            <p className="mt-1 text-sm text-ink-muted">{passo.texto}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onAnterior}
              disabled={passoAtual === 0}
              className="rounded-lg px-3 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted disabled:opacity-40"
            >
              Voltar
            </button>
            <button
              onClick={onProximo}
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              {passoAtual + 1 === passoTotal ? 'Concluir' : 'Próximo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
