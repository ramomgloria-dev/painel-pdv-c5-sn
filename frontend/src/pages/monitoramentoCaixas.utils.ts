export interface StatusCaixa {
  nroempresa: number;
  nomereduzido: string;
  nrocheckout: number;
  especie: string;
  status: string;
}

export interface GrupoLoja {
  nroempresa: number;
  nomereduzido: string;
  caixas: StatusCaixa[];
}

export const RESUMO_STATUS = [
  { chave: 'Caixa aberto', rotulo: 'Abertos', cor: 'text-green-700 bg-green-50' },
  { chave: 'Caixa em venda', rotulo: 'Em venda', cor: 'text-green-700 bg-green-50' },
  { chave: 'Caixa fechado', rotulo: 'Fechados', cor: 'text-ink-muted bg-surface-muted' },
  { chave: 'Caixa com saída temporária', rotulo: 'Saída temporária', cor: 'text-amber-700 bg-amber-50' },
  { chave: 'Devolução de Venda', rotulo: 'Devolução', cor: 'text-blue-700 bg-blue-50' },
];

// Categorias visuais dos quadradinhos: "Caixa aberto" e "Caixa em venda" viram
// a mesma cor (verde) — pra quem está de olho no painel, as duas significam
// "funcionando normalmente"; diferenciar por cor ali não ajudaria em nada e
// só acrescentaria uma legenda a mais pra decorar.
export const CATEGORIA_TILE = {
  ativo: { estilo: 'bg-green-50 border-green-200 text-green-700', rotulo: 'Aberto / em venda' },
  fechado: { estilo: 'bg-surface-muted border-border text-ink-muted', rotulo: 'Fechado' },
  saida: { estilo: 'bg-amber-50 border-amber-200 text-amber-700', rotulo: 'Saída temporária' },
  devolucao: { estilo: 'bg-blue-50 border-blue-200 text-blue-700', rotulo: 'Devolução' },
  outro: { estilo: 'bg-surface-muted border-border text-ink-muted', rotulo: 'Outro' },
} as const;

export type CategoriaTile = keyof typeof CATEGORIA_TILE;

export function categoriaDoStatus(status: string): CategoriaTile {
  switch (status) {
    case 'Caixa aberto':
    case 'Caixa em venda':
      return 'ativo';
    case 'Caixa fechado':
      return 'fechado';
    case 'Caixa com saída temporária':
      return 'saida';
    case 'Devolução de Venda':
      return 'devolucao';
    default:
      return 'outro';
  }
}

/**
 * Filtra a lista de caixas pelos status selecionados e pelo texto de busca
 * do número do caixa (substring, não precisa ser exato).
 */
export function filtrarCaixas(caixas: StatusCaixa[], statusSelecionados: string[], buscaCaixa: string): StatusCaixa[] {
  const termoCaixa = buscaCaixa.trim();
  return caixas.filter((c) => {
    if (statusSelecionados.length > 0 && !statusSelecionados.includes(c.status)) return false;
    if (termoCaixa && !String(c.nrocheckout).includes(termoCaixa)) return false;
    return true;
  });
}

/**
 * Agrupa por loja pra quem tem muitos checkouts (ex.: 20+) não precisar
 * rolar uma tabela enorme — cada loja vira uma seção com uma grade de
 * quadradinhos por caixa, em vez de uma linha de tabela por checkout.
 * Preserva a ordem de primeira aparição de cada loja em `caixas`.
 */
export function agruparPorLoja(caixas: StatusCaixa[]): GrupoLoja[] {
  const mapa = new Map<number, GrupoLoja>();
  for (const c of caixas) {
    if (!mapa.has(c.nroempresa)) {
      mapa.set(c.nroempresa, { nroempresa: c.nroempresa, nomereduzido: c.nomereduzido, caixas: [] });
    }
    mapa.get(c.nroempresa)!.caixas.push(c);
  }
  return [...mapa.values()];
}

/** Contagem por status, só as que têm pelo menos 1 caixa — usada no resumo
 * geral do topo e no cabeçalho de cada seção de loja. */
export function contarPorStatus(caixas: StatusCaixa[]) {
  return RESUMO_STATUS.map((item) => ({
    ...item,
    total: caixas.filter((c) => c.status === item.chave).length,
  })).filter((item) => item.total > 0);
}
