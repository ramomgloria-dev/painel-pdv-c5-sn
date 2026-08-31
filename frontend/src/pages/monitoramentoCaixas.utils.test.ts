import { describe, expect, it } from 'vitest';
import { agruparPorLoja, categoriaDoStatus, contarPorStatus, filtrarCaixas, type StatusCaixa } from './monitoramentoCaixas.utils';

const CAIXAS: StatusCaixa[] = [
  { nroempresa: 57, nomereduzido: '057-SN-HOTPT', nrocheckout: 1, especie: 'Cupom Fiscal', status: 'Caixa em venda' },
  { nroempresa: 57, nomereduzido: '057-SN-HOTPT', nrocheckout: 2, especie: 'Fechamento de Caixa', status: 'Caixa fechado' },
  { nroempresa: 57, nomereduzido: '057-SN-HOTPT', nrocheckout: 12, especie: 'Abertura de Caixa', status: 'Caixa aberto' },
  { nroempresa: 60, nomereduzido: '060-SN-LSANT', nrocheckout: 1, especie: 'Saída Temporária', status: 'Caixa com saída temporária' },
];

describe('filtrarCaixas', () => {
  it('sem filtro nenhum, devolve tudo', () => {
    expect(filtrarCaixas(CAIXAS, [], '')).toHaveLength(4);
  });

  it('filtra por status selecionado', () => {
    const resultado = filtrarCaixas(CAIXAS, ['Caixa fechado'], '');
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.nrocheckout).toBe(2);
  });

  it('filtra por número do caixa (substring, não precisa ser exato)', () => {
    const resultado = filtrarCaixas(CAIXAS, [], '1');
    // "1" bate em nrocheckout 1 (duas lojas) e 12 — substring, não igualdade
    expect(resultado.map((c) => c.nrocheckout).sort()).toEqual([1, 1, 12]);
  });

  it('combina status e número do caixa', () => {
    const resultado = filtrarCaixas(CAIXAS, ['Caixa em venda'], '1');
    expect(resultado).toHaveLength(1);
    expect(resultado[0]!.nroempresa).toBe(57);
  });
});

describe('agruparPorLoja', () => {
  it('agrupa por nroempresa preservando os caixas de cada loja', () => {
    const grupos = agruparPorLoja(CAIXAS);
    expect(grupos).toHaveLength(2);
    const loja57 = grupos.find((g) => g.nroempresa === 57);
    expect(loja57?.caixas).toHaveLength(3);
    expect(loja57?.nomereduzido).toBe('057-SN-HOTPT');
  });

  it('lista vazia gera grupos vazios', () => {
    expect(agruparPorLoja([])).toEqual([]);
  });
});

describe('contarPorStatus', () => {
  it('só inclui status com pelo menos 1 caixa', () => {
    const contagens = contarPorStatus(CAIXAS);
    const chaves = contagens.map((c) => c.chave);
    expect(chaves).toContain('Caixa em venda');
    expect(chaves).toContain('Caixa fechado');
    expect(chaves).toContain('Caixa aberto');
    expect(chaves).toContain('Caixa com saída temporária');
    expect(chaves).not.toContain('Devolução de Venda');
  });

  it('lista vazia não gera nenhuma contagem', () => {
    expect(contarPorStatus([])).toEqual([]);
  });
});

describe('categoriaDoStatus', () => {
  it('"Caixa aberto" e "Caixa em venda" têm categorias visuais distintas', () => {
    expect(categoriaDoStatus('Caixa aberto')).toBe('aberto');
    expect(categoriaDoStatus('Caixa em venda')).toBe('venda');
  });

  it('mapeia os demais status conhecidos', () => {
    expect(categoriaDoStatus('Caixa fechado')).toBe('fechado');
    expect(categoriaDoStatus('Caixa com saída temporária')).toBe('saida');
    expect(categoriaDoStatus('Devolução de Venda')).toBe('devolucao');
  });

  it('status desconhecido cai em "outro"', () => {
    expect(categoriaDoStatus('Status Novo Que Ainda Não Existe')).toBe('outro');
  });
});
