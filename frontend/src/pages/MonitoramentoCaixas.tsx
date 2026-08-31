import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RefreshCw, AlertCircle, Inbox, ChevronDown, ChevronRight, HelpCircle, WifiOff } from 'lucide-react';
import { api } from '../lib/api';
import { MultiSelectDropdown } from '../components/ui/MultiSelectDropdown';
import { isAxiosErrorWithMessage } from '../auth/AuthContext';
import { useTutorial, type PassoTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from '../components/ui/TutorialOverlay';
import type { AppLayoutContext } from '../components/layout/AppLayout';
import {
  agruparPorLoja,
  CATEGORIA_TILE,
  categoriaDoStatus,
  contarOffline,
  contarPorStatus,
  filtrarCaixas,
  RESUMO_STATUS,
  type GrupoLoja,
  type StatusCaixa,
} from './monitoramentoCaixas.utils';

interface EmpresaFiltro {
  nroempresa: number;
  nomereduzido: string;
}

const DEBOUNCE_FILTRO_MS = 450;
const INTERVALO_ATUALIZACAO_MS = 30_000;

const OPCOES_STATUS = RESUMO_STATUS.map((s) => ({ value: s.chave, label: s.rotulo }));

const PASSOS_TUTORIAL: PassoTutorial[] = [
  {
    alvoSelector: '[data-tutorial="filtro-empresa"]',
    titulo: 'Filtre por empresa',
    texto: 'Escolha uma ou mais lojas pra ver só os caixas delas. Sem seleção nenhuma, mostra todas.',
  },
  {
    alvoSelector: '[data-tutorial="filtro-status"]',
    titulo: 'Filtre por status',
    texto: 'Marque um ou mais status (aberto, fechado, em venda...) pra mostrar só os caixas nessa situação.',
  },
  {
    alvoSelector: '[data-tutorial="busca-nro-caixa"]',
    titulo: 'Busque por número do caixa',
    texto: 'Digite o número do checkout pra achar ele rápido, mesmo com vários filtros de empresa/status já aplicados.',
  },
  {
    alvoSelector: '[data-tutorial="ao-vivo"]',
    titulo: 'Atualização automática',
    texto: 'A tela se atualiza sozinha a cada 30 segundos. Esse indicador mostra quando foi a última vez — e o botão ao lado força uma atualização na hora.',
  },
  {
    alvoSelector: '[data-tutorial="secao-loja"]',
    titulo: 'Caixas agrupados por loja',
    texto: 'Cada loja é uma seção que abre e fecha. Clique pra ver os caixas em uma grade colorida por status — passe o mouse num quadradinho pra ver o detalhe.',
  },
];

export function MonitoramentoCaixas() {
  const [empresasFiltro, setEmpresasFiltro] = useState<EmpresaFiltro[]>([]);
  const [empresasSelecionadas, setEmpresasSelecionadas] = useState<number[]>([]);
  const [statusSelecionados, setStatusSelecionados] = useState<string[]>([]);
  const [buscaCaixa, setBuscaCaixa] = useState('');

  const [caixas, setCaixas] = useState<StatusCaixa[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [expandidosManual, setExpandidosManual] = useState<Record<number, boolean>>({});

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api
      .get<{ empresas: EmpresaFiltro[] }>('/monitoramento-caixas/empresas')
      .then((res) => setEmpresasFiltro(res.data.empresas))
      .catch(() => {
        /* filtro fica vazio; a listagem principal ainda funciona sem ele */
      });
  }, []);

  const carregar = useCallback(async (empresas: number[]) => {
    setCarregando(true);
    setErro(null);
    try {
      const params = empresas.length > 0 ? { empresas: empresas.join(',') } : undefined;
      const res = await api.get<{ atualizadoEm: string; caixas: StatusCaixa[] }>('/monitoramento-caixas/status-caixas', { params });
      setCaixas(res.data.caixas);
      setUltimaAtualizacao(new Date(res.data.atualizadoEm));
    } catch (err) {
      const mensagem = isAxiosErrorWithMessage(err)
        ? err.response!.data.error
        : 'Não foi possível carregar as informações. Tente novamente em alguns instantes.';
      setErro(mensagem);
      setCaixas(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  // primeira carga, sem debounce
  useEffect(() => {
    void carregar([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // troca de empresa: espera a seleção "assentar" antes de buscar de novo,
  // pra não disparar uma requisição (e um flash de loading) a cada clique
  // dentro do dropdown quando a pessoa está marcando várias empresas seguidas.
  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void carregar(empresasSelecionadas);
    }, DEBOUNCE_FILTRO_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresasSelecionadas]);

  // Atualização automática: evita depender da pessoa ficar clicando em
  // "Atualizar" pra ver o status corrente dos caixas. Pausa quando a aba
  // sai de foco (usuário trocou de aba/minimizou) pra não gastar requisição
  // à toa, e busca na hora quando ela volta a ficar visível.
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function iniciarIntervalo() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        void carregar(empresasSelecionadas);
      }, INTERVALO_ATUALIZACAO_MS);
    }

    function pararIntervalo() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function aoMudarVisibilidade() {
      if (document.visibilityState === 'visible') {
        void carregar(empresasSelecionadas);
        iniciarIntervalo();
      } else {
        pararIntervalo();
      }
    }

    if (document.visibilityState === 'visible') iniciarIntervalo();
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      pararIntervalo();
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [carregar, empresasSelecionadas]);

  const opcoesEmpresa = useMemo(
    () => empresasFiltro.map((e) => ({ value: e.nroempresa, label: e.nomereduzido })),
    [empresasFiltro],
  );

  const caixasFiltradas = useMemo(
    () => (caixas ? filtrarCaixas(caixas, statusSelecionados, buscaCaixa) : []),
    [caixas, statusSelecionados, buscaCaixa],
  );

  const resumo = useMemo(() => contarPorStatus(caixasFiltradas), [caixasFiltradas]);
  const totalOffline = useMemo(() => contarOffline(caixasFiltradas), [caixasFiltradas]);

  const gruposPorLoja = useMemo(() => agruparPorLoja(caixasFiltradas), [caixasFiltradas]);

  const carregandoPrimeiraVez = carregando && caixas === null;

  function alternarExpandido(nroempresa: number, expandidoAtual: boolean) {
    setExpandidosManual((prev) => ({ ...prev, [nroempresa]: !expandidoAtual }));
  }

  const { novidadesAberto } = useOutletContext<AppLayoutContext>();
  const tutorial = useTutorial('monitoramento_caixas_v1', PASSOS_TUTORIAL);

  return (
    <div className="flex flex-col gap-5">
      <TutorialOverlay
        ativo={tutorial.ativo && !novidadesAberto}
        passo={tutorial.passo}
        passoAtual={tutorial.passoAtual}
        passoTotal={tutorial.passoTotal}
        onProximo={tutorial.proximo}
        onAnterior={tutorial.anterior}
        onPular={tutorial.pular}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Monitoramento de Caixas</h1>
          <p className="text-sm text-ink-muted">Situação dos caixas hoje, por empresa e checkout.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={tutorial.reiniciar}
            title="Rever tutorial desta página"
            aria-label="Rever tutorial desta página"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <HelpCircle className="h-4 w-4" />
          </button>

          <div
            data-tutorial="ao-vivo"
            className="flex items-center gap-2.5 self-start rounded-full border border-border bg-surface py-1 pl-3 pr-1.5"
          >
          <span className="flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {ultimaAtualizacao
              ? `Atualizado às ${ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Atualizando...'}
          </span>
          <button
            onClick={() => void carregar(empresasSelecionadas)}
            disabled={carregando}
            title="Atualizar agora"
            aria-label="Atualizar agora"
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${carregando && !carregandoPrimeiraVez ? 'animate-spin' : ''}`} />
          </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div data-tutorial="filtro-empresa">
          <MultiSelectDropdown
            options={opcoesEmpresa}
            selected={empresasSelecionadas}
            onChange={setEmpresasSelecionadas}
            placeholderTodos="Todas as empresas"
            buscarPlaceholder="Buscar empresa..."
            rotuloMultiplas={(n) => `${n} empresas selecionadas`}
          />
        </div>
        <div data-tutorial="filtro-status">
          <MultiSelectDropdown
            options={OPCOES_STATUS}
            selected={statusSelecionados}
            onChange={setStatusSelecionados}
            placeholderTodos="Todos os status"
            semBusca
            className="sm:w-52"
            rotuloMultiplas={(n) => `${n} status selecionados`}
          />
        </div>
        <input
          data-tutorial="busca-nro-caixa"
          value={buscaCaixa}
          onChange={(e) => setBuscaCaixa(e.target.value)}
          inputMode="numeric"
          placeholder="Nº Caixa"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:w-28"
        />
      </div>

      {(resumo.length > 0 || totalOffline > 0) && (
        <div className="flex flex-wrap gap-3">
          {resumo.map((item) => (
            <div key={item.chave} className="flex w-44 flex-col gap-1 rounded-xl border border-border bg-surface px-4 py-3">
              <span className={`w-fit rounded-full px-2 py-0.5 text-xs font-medium ${item.cor}`}>{item.rotulo}</span>
              <span className="text-2xl font-semibold text-ink">{item.total}</span>
            </div>
          ))}
          {totalOffline > 0 && (
            <div className="flex w-44 flex-col gap-1 rounded-xl border border-red-200 bg-red-50/40 px-4 py-3">
              <span className="flex w-fit items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                <WifiOff className="h-3 w-3" />
                PDV offline
              </span>
              <span className="text-2xl font-semibold text-ink">{totalOffline}</span>
            </div>
          )}
        </div>
      )}

      {carregandoPrimeiraVez && <ListaCarregando />}

      {erro && caixas === null && !carregando && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-16 text-center">
          <AlertCircle className="h-8 w-8 text-brand-500" />
          <p className="text-sm font-medium text-ink">{erro}</p>
        </div>
      )}

      {caixas !== null && gruposPorLoja.length === 0 && !carregandoPrimeiraVez && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-16 text-center">
          <Inbox className="h-8 w-8 text-ink-muted" />
          <p className="text-sm font-medium text-ink">Nenhum caixa encontrado.</p>
          <p className="text-sm text-ink-muted">Verifique os filtros e tente novamente.</p>
        </div>
      )}

      {caixas !== null && gruposPorLoja.length > 0 && (
        // opacity sutil em vez de trocar por skeleton: evita o "piscar" ao
        // atualizar um filtro (ou no polling automático) quando já existe
        // dado na tela
        <div className={`flex flex-col gap-3 transition-opacity duration-200 ${carregando ? 'opacity-60' : 'opacity-100'}`}>
          {gruposPorLoja.map((grupo, indice) => {
            const expandido = expandidosManual[grupo.nroempresa] ?? gruposPorLoja.length === 1;
            return (
              <SecaoLoja
                key={grupo.nroempresa}
                grupo={grupo}
                expandido={expandido}
                onToggle={() => alternarExpandido(grupo.nroempresa, expandido)}
                tutorialAlvo={indice === 0}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SecaoLoja({
  grupo,
  expandido,
  onToggle,
  tutorialAlvo,
}: {
  grupo: GrupoLoja;
  expandido: boolean;
  onToggle: () => void;
  tutorialAlvo?: boolean;
}) {
  const contagens = contarPorStatus(grupo.caixas);

  const categoriasPresentes = [...new Set(grupo.caixas.map((c) => categoriaDoStatus(c.status)))];
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={cardRef} data-tutorial={tutorialAlvo ? 'secao-loja' : undefined} className="rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expandido}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/40"
      >
        <div className="flex items-center gap-2.5">
          {expandido ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
          )}
          <div>
            <p className="text-sm font-semibold text-ink">
              {grupo.nroempresa} — {grupo.nomereduzido}
            </p>
            <p className="text-xs text-ink-muted">{grupo.caixas.length === 1 ? '1 caixa' : `${grupo.caixas.length} caixas`}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {contagens.map((item) => (
            <span key={item.chave} className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${item.cor}`}>
              {item.total} {item.rotulo.toLowerCase()}
            </span>
          ))}
        </div>
      </button>

      {expandido && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {grupo.caixas
              .slice()
              .sort((a, b) => a.nrocheckout - b.nrocheckout)
              .map((c) => (
                <CaixaTile key={c.nrocheckout} caixa={c} limiteRef={cardRef} />
              ))}
          </div>
          {categoriasPresentes.length > 1 && (
            <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
              {categoriasPresentes.map((cat) => (
                <span key={cat} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-[4px] border ${CATEGORIA_TILE[cat].estilo}`} />
                  {CATEGORIA_TILE[cat].rotulo}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CaixaTile({ caixa, limiteRef }: { caixa: StatusCaixa; limiteRef: RefObject<HTMLDivElement | null> }) {
  const categoria = CATEGORIA_TILE[categoriaDoStatus(caixa.status)];
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [deslocamentoX, setDeslocamentoX] = useState(0);

  // O tooltip nasce centralizado no quadradinho — pra caixas perto da borda
  // do card (ex.: caixa 1 de cada loja) isso cortaria o tooltip pra fora,
  // ou pior, pra baixo da sidebar fixa (que fica à esquerda da área de
  // conteúdo e pinta por cima de qualquer coisa posicionada ali embaixo).
  // Por isso o limite usado aqui é a borda do PRÓPRIO CARD da loja — que já
  // nasce depois da sidebar — e não a janela inteira.
  function ajustarPosicaoTooltip() {
    const wrapper = wrapperRef.current;
    const tooltip = tooltipRef.current;
    if (!wrapper || !tooltip) return;
    const MARGEM = 8;
    const wrapperRect = wrapper.getBoundingClientRect();
    const limiteRect = limiteRef.current?.getBoundingClientRect();
    const minX = (limiteRect?.left ?? 0) + MARGEM;
    const maxX = (limiteRect?.right ?? window.innerWidth) - MARGEM;
    const centroTile = wrapperRect.left + wrapperRect.width / 2;
    const meiaLarguraTooltip = tooltip.offsetWidth / 2;

    let ajuste = 0;
    if (centroTile - meiaLarguraTooltip < minX) {
      ajuste = minX - (centroTile - meiaLarguraTooltip);
    } else if (centroTile + meiaLarguraTooltip > maxX) {
      ajuste = maxX - (centroTile + meiaLarguraTooltip);
    }
    setDeslocamentoX(ajuste);
  }

  const offline = caixa.online === false;

  return (
    <div ref={wrapperRef} className="group relative" onMouseEnter={ajustarPosicaoTooltip}>
      <div
        className={`flex h-11 w-11 cursor-default items-center justify-center rounded-lg border text-sm font-semibold transition-transform group-hover:scale-105 ${categoria.estilo} ${offline ? 'opacity-50 grayscale' : ''}`}
      >
        {caixa.nrocheckout}
      </div>
      {offline && (
        <span
          title="PDV offline"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-surface bg-red-500 text-white"
        >
          <WifiOff className="h-2.5 w-2.5" />
        </span>
      )}
      <div
        ref={tooltipRef}
        style={{ transform: `translateX(calc(-50% + ${deslocamentoX}px))` }}
        className="pointer-events-none absolute -top-14 left-1/2 z-10 flex flex-col items-center whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        <span className="font-semibold">
          Caixa {caixa.nrocheckout} — {caixa.especie}
        </span>
        <span className="text-[11px] text-white/70">{caixa.status}</span>
        {offline && <span className="text-[11px] font-medium text-red-300">PDV offline</span>}
      </div>
    </div>
  );
}

function ListaCarregando() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl border border-border bg-surface-muted/60" />
      ))}
    </div>
  );
}
