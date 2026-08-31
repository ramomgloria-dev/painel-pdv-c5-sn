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

const MARGEM = 12;

/**
 * Destaque tipo "spotlight" ao redor do elemento alvo de cada passo, com um
 * balão de explicação. Dois cuidados que já nos morderam nesse projeto:
 *
 * 1) O retângulo medido é recortado pro que está de fato visível na tela —
 *    um alvo maior que a viewport (ex.: uma lista de 1000+ linhas sem
 *    filtro) senão gera um "destaque" e um balão inteiramente fora da tela.
 * 2) O balão sempre é renderizado, mesmo sem conseguir medir o alvo — nunca
 *    deixa a pessoa presa numa tela escura sem "Pular"/"Próximo" visível.
 */
export function TutorialOverlay({ ativo, passo, passoAtual, passoTotal, onProximo, onAnterior, onPular }: TutorialOverlayProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const [posicaoCallout, setPosicaoCallout] = useState({ top: 0, deslocamentoX: 0 });

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
      // Elemento maior que a tela (ex.: lista de usuários sem filtro, com
      // milhares de linhas) — centralizar mostraria uma fatia aleatória no
      // meio da lista. Alinha pelo topo nesse caso, pra pelo menos mostrar
      // o início de verdade.
      const cabeNaTela = alvo.getBoundingClientRect().height <= window.innerHeight - MARGEM * 2;
      alvo.scrollIntoView({ behavior: 'smooth', block: cabeNaTela ? 'center' : 'start' });
      window.setTimeout(() => {
        if (cancelado) return;
        const bruto = alvo.getBoundingClientRect();
        const top = Math.max(bruto.top, 0);
        const left = Math.max(bruto.left, 0);
        const bottom = Math.min(bruto.bottom, window.innerHeight);
        const right = Math.min(bruto.right, window.innerWidth);
        setRect(bottom - top > 0 && right - left > 0 ? new DOMRect(left, top, right - left, bottom - top) : null);
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
    const callout = calloutRef.current;
    if (!callout) return;
    const largura = callout.offsetWidth;
    const altura = callout.offsetHeight;

    if (!rect) {
      // sem alvo pra ancorar: centraliza o balão na tela mesmo assim
      setPosicaoCallout({ top: window.innerHeight / 2 - altura / 2, deslocamentoX: 0 });
      return;
    }

    const centro = rect.left + rect.width / 2;
    let deslocamentoX = 0;
    if (centro - largura / 2 < MARGEM) {
      deslocamentoX = MARGEM - (centro - largura / 2);
    } else if (centro + largura / 2 > window.innerWidth - MARGEM) {
      deslocamentoX = window.innerWidth - MARGEM - (centro + largura / 2);
    }

    // Vertical: prefere embaixo do alvo; se não couber, tenta em cima; se
    // nenhum dos dois couber (alvo ocupa quase a tela toda), encaixa dentro
    // da viewport mesmo assim — nunca deixa o balão inacessível.
    const espacoAbaixo = window.innerHeight - rect.bottom;
    const espacoAcima = rect.top;
    let top: number;
    if (espacoAbaixo >= altura + 16 + MARGEM) {
      top = rect.bottom + 16;
    } else if (espacoAcima >= altura + 16 + MARGEM) {
      top = rect.top - altura - 16;
    } else {
      top = Math.min(Math.max(rect.bottom + 16, MARGEM), window.innerHeight - altura - MARGEM);
    }

    setPosicaoCallout({ top, deslocamentoX });
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

      <div
        ref={calloutRef}
        className="absolute flex w-72 flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl"
        style={{
          top: posicaoCallout.top,
          left: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          transform: `translateX(calc(-50% + ${posicaoCallout.deslocamentoX}px))`,
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
    </div>
  );
}
