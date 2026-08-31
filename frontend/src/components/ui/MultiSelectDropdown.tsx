import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

export interface MultiSelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface MultiSelectDropdownProps<T extends string | number> {
  options: MultiSelectOption<T>[];
  selected: T[];
  onChange: (selected: T[]) => void;
  placeholderTodos: string;
  rotuloMultiplas?: (n: number) => string;
  buscarPlaceholder?: string;
  /** esconde a caixa de busca — útil quando a lista já é curta (ex.: status) */
  semBusca?: boolean;
  className?: string;
}

/**
 * Seleção múltipla com busca. Nenhum item marcado = "todos" (o chamador
 * interpreta array vazio como "sem filtro").
 */
export function MultiSelectDropdown<T extends string | number>({
  options,
  selected,
  onChange,
  placeholderTodos,
  rotuloMultiplas = (n) => `${n} selecionados`,
  buscarPlaceholder = 'Buscar...',
  semBusca = false,
  className = '',
}: MultiSelectDropdownProps<T>) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return options;
    return options.filter((o) => o.label.toLowerCase().includes(termo));
  }, [options, busca]);

  const rotulo = useMemo(() => {
    if (selected.length === 0) return placeholderTodos;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label ?? rotuloMultiplas(1);
    }
    return rotuloMultiplas(selected.length);
  }, [selected, options, placeholderTodos, rotuloMultiplas]);

  function alternar(value: T) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full sm:w-64 ${className}`}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors hover:border-ink-muted focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      >
        <span className="truncate">{rotulo}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {!semBusca && (
            <div className="relative border-b border-border p-2">
              <Search className="pointer-events-none absolute left-4.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={buscarPlaceholder}
                className="w-full rounded-md border border-border py-1.5 pl-7 pr-2 text-xs outline-none focus:border-brand-500"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
            >
              <span className="font-medium">{placeholderTodos}</span>
              {selected.length === 0 && <Check className="h-3.5 w-3.5 text-brand-500" />}
            </button>

            {filtradas.length === 0 && <p className="px-3 py-2 text-sm text-ink-muted">Nada encontrado.</p>}

            {filtradas.map((option) => {
              const marcada = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => alternar(option.value)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted"
                >
                  <span className="truncate">{option.label}</span>
                  {marcada && <Check className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
