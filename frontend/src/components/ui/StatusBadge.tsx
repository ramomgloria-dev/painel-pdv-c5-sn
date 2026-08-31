const STATUS_STYLES: Record<string, string> = {
  'Caixa aberto': 'bg-green-50 text-green-700',
  'Caixa em venda': 'bg-green-50 text-green-700',
  'Caixa fechado': 'bg-surface-muted text-ink-muted',
  'Caixa com saída temporária': 'bg-amber-50 text-amber-700',
  'Devolução de Venda': 'bg-blue-50 text-blue-700',
};

export function StatusBadge({ status }: { status: string }) {
  const estilo = STATUS_STYLES[status] ?? 'bg-surface-muted text-ink-muted';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${estilo}`}>
      {status}
    </span>
  );
}
