import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  rotuloItem?: string;
  onChange: (pagina: number) => void;
  disabled?: boolean;
}

export function Pagination({ pagina, totalPaginas, total, rotuloItem = 'item', onChange, disabled }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-ink-muted">
      <span>
        {total} {rotuloItem}
        {total === 1 ? '' : 's'} · página {pagina} de {totalPaginas}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(pagina - 1, 1))}
          disabled={disabled || pagina <= 1}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>
        <button
          onClick={() => onChange(Math.min(pagina + 1, totalPaginas))}
          disabled={disabled || pagina >= totalPaginas}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
