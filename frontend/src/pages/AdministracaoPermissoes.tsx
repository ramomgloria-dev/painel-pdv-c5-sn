import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ShieldCheck, Building2, X, Save, RotateCcw, CheckCircle2, HelpCircle, Store, LayoutGrid } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth, isAxiosErrorWithMessage } from '../auth/AuthContext';
import { Pagination } from '../components/ui/Pagination';
import { Toggle } from '../components/ui/Toggle';
import { useTutorial, type PassoTutorial } from '../hooks/useTutorial';
import { TutorialOverlay } from '../components/ui/TutorialOverlay';
import type { AppLayoutContext } from '../components/layout/AppLayout';
import { iniciais } from '../lib/iniciais';

interface PermissaoCatalogo {
  id: number;
  chave: string;
  descricao: string;
  escopoEmpresa: boolean;
}

interface EmpresaCatalogo {
  nroempresa: number;
  nomereduzido: string;
}

interface UsuarioBusca {
  codusuario: string;
  nome: string;
  totalPermissoes: number;
  totalEmpresas: number;
}

const ICONE_PERMISSAO: Record<string, { Icone: ComponentType<{ className?: string }>; cor: string }> = {
  'monitoramento_caixas.view': { Icone: Store, cor: 'bg-amber-50 text-amber-600' },
  'usuarios_permissoes.manage': { Icone: ShieldCheck, cor: 'bg-purple-50 text-purple-600' },
};
const ICONE_PERMISSAO_PADRAO = { Icone: LayoutGrid, cor: 'bg-surface-muted text-ink-muted' };

interface EmpresaConcedida {
  permissaoId: number;
  nroempresa: number;
}

interface UsuarioDetalhe {
  codusuario: string;
  nome: string;
  permissoesConcedidas: number[];
  empresasConcedidas: EmpresaConcedida[];
}

const TAMANHO_PAGINA = 20;

const PASSOS_TUTORIAL: PassoTutorial[] = [
  {
    alvoSelector: '[data-tutorial="busca-usuario"]',
    titulo: 'Busque um usuário',
    texto: 'Digite o nome ou o login do usuário do Consinco pra encontrar ele e editar os acessos.',
  },
  {
    alvoSelector: '[data-tutorial="lista-usuarios"]',
    titulo: 'Escolha na lista',
    texto: 'Clique num usuário da lista pra abrir o painel de edição dele ao lado.',
  },
  {
    alvoSelector: '[data-tutorial="painel-edicao"]',
    titulo: 'Páginas e empresas liberadas',
    texto: 'Marque quais páginas o usuário pode acessar. Quando uma página usa recorte por empresa, aparece uma lista de empresas logo abaixo dela pra você escolher quais liberar. Não esqueça de clicar em "Salvar alterações" no final.',
  },
];

function empresasParaMapa(lista: EmpresaConcedida[]): Map<number, Set<number>> {
  const mapa = new Map<number, Set<number>>();
  for (const item of lista) {
    if (!mapa.has(item.permissaoId)) mapa.set(item.permissaoId, new Set());
    mapa.get(item.permissaoId)!.add(item.nroempresa);
  }
  return mapa;
}

function setsIguais(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function AdministracaoPermissoes() {
  const [permissoes, setPermissoes] = useState<PermissaoCatalogo[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaCatalogo[]>([]);

  const [termoBusca, setTermoBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [resultados, setResultados] = useState<UsuarioBusca[]>([]);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [buscando, setBuscando] = useState(false);

  const [identidade, setIdentidade] = useState<{ codusuario: string; nome: string } | null>(null);
  const [originalPermissoes, setOriginalPermissoes] = useState<Set<number>>(new Set());
  const [originalEmpresas, setOriginalEmpresas] = useState<Map<number, Set<number>>>(new Map());
  const [draftPermissoes, setDraftPermissoes] = useState<Set<number>>(new Set());
  const [draftEmpresas, setDraftEmpresas] = useState<Map<number, Set<number>>>(new Map());
  const [filtroEmpresaPorPermissao, setFiltroEmpresaPorPermissao] = useState<Record<number, string>>({});

  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ permissoes: PermissaoCatalogo[]; empresas: EmpresaCatalogo[] }>('/administracao/catalogos')
      .then((res) => {
        setPermissoes(res.data.permissoes);
        setEmpresas(res.data.empresas);
      })
      .catch(() => setErro('Não foi possível carregar as páginas e empresas. Tente novamente em alguns instantes.'));
  }, []);

  useEffect(() => {
    setBuscando(true);
    const timer = setTimeout(() => {
      api
        .get<{ usuarios: UsuarioBusca[]; total: number; totalPaginas: number }>('/administracao/usuarios', {
          params: { termo: termoBusca.trim() || undefined, page: pagina, pageSize: TAMANHO_PAGINA },
        })
        .then((res) => {
          setResultados(res.data.usuarios);
          setTotalUsuarios(res.data.total);
          setTotalPaginas(res.data.totalPaginas);
        })
        .catch(() => setErro('Não foi possível buscar usuários. Tente novamente em alguns instantes.'))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [termoBusca, pagina]);

  useEffect(() => {
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termoBusca]);

  const dirty = useMemo(() => {
    if (!setsIguais(draftPermissoes, originalPermissoes)) return true;
    const chaves = new Set([...draftEmpresas.keys(), ...originalEmpresas.keys()]);
    for (const chave of chaves) {
      const a = draftEmpresas.get(chave) ?? new Set<number>();
      const b = originalEmpresas.get(chave) ?? new Set<number>();
      if (!setsIguais(a, b)) return true;
    }
    return false;
  }, [draftPermissoes, originalPermissoes, draftEmpresas, originalEmpresas]);

  const aplicarDetalhe = useCallback((detalhe: UsuarioDetalhe) => {
    setIdentidade({ codusuario: detalhe.codusuario, nome: detalhe.nome });
    setOriginalPermissoes(new Set(detalhe.permissoesConcedidas));
    setDraftPermissoes(new Set(detalhe.permissoesConcedidas));
    const mapa = empresasParaMapa(detalhe.empresasConcedidas);
    setOriginalEmpresas(mapa);
    setDraftEmpresas(new Map([...mapa].map(([k, v]) => [k, new Set(v)])));
  }, []);

  const carregarDetalhe = useCallback(
    async (codusuario: string) => {
      setCarregandoDetalhe(true);
      setErro(null);
      setSalvo(false);
      try {
        const res = await api.get<UsuarioDetalhe>(`/administracao/usuarios/${encodeURIComponent(codusuario)}`);
        aplicarDetalhe(res.data);
      } catch (err) {
        setErro(isAxiosErrorWithMessage(err) ? err.response!.data.error : 'Não foi possível carregar o usuário.');
      } finally {
        setCarregandoDetalhe(false);
      }
    },
    [aplicarDetalhe],
  );

  function selecionarUsuario(u: UsuarioBusca) {
    if (dirty && !window.confirm('Você tem alterações não salvas neste usuário. Descartar e trocar de usuário?')) return;
    void carregarDetalhe(u.codusuario);
  }

  function fecharPainel() {
    if (dirty && !window.confirm('Você tem alterações não salvas. Descartar e fechar?')) return;
    setIdentidade(null);
  }

  function alternarPermissaoDraft(permissao: PermissaoCatalogo) {
    setSalvo(false);
    setDraftPermissoes((prev) => {
      const novo = new Set(prev);
      if (novo.has(permissao.id)) novo.delete(permissao.id);
      else novo.add(permissao.id);
      return novo;
    });
  }

  function alternarEmpresaDraft(permissaoId: number, nroempresa: number) {
    setSalvo(false);
    setDraftEmpresas((prev) => {
      const novo = new Map(prev);
      const atual = new Set(novo.get(permissaoId) ?? []);
      if (atual.has(nroempresa)) atual.delete(nroempresa);
      else atual.add(nroempresa);
      novo.set(permissaoId, atual);
      return novo;
    });
  }

  // "Marcar/desmarcar todas" opera sobre a lista de `empresas` já devolvida
  // pelo backend — que, pra um gestor comum, já vem recortada só com as
  // empresas que ele mesmo tem (ver administracao.service.ts). Por isso não
  // precisa de nenhuma checagem extra aqui: nunca é possível marcar mais do
  // que o catálogo permitido.
  function marcarTodasEmpresas(permissaoId: number) {
    setSalvo(false);
    setDraftEmpresas((prev) => {
      const novo = new Map(prev);
      novo.set(permissaoId, new Set(empresas.map((e) => e.nroempresa)));
      return novo;
    });
  }

  function desmarcarTodasEmpresas(permissaoId: number) {
    setSalvo(false);
    setDraftEmpresas((prev) => {
      const novo = new Map(prev);
      novo.set(permissaoId, new Set());
      return novo;
    });
  }

  function descartarAlteracoes() {
    setDraftPermissoes(new Set(originalPermissoes));
    setDraftEmpresas(new Map([...originalEmpresas].map(([k, v]) => [k, new Set(v)])));
    setSalvo(false);
    setErro(null);
  }

  async function salvarAlteracoes() {
    if (!identidade) return;
    setSalvando(true);
    setErro(null);
    try {
      const permissoesConceder = [...draftPermissoes].filter((id) => !originalPermissoes.has(id));
      const permissoesRevogar = [...originalPermissoes].filter((id) => !draftPermissoes.has(id));

      const chavesEmpresa = new Set([...draftEmpresas.keys(), ...originalEmpresas.keys()]);
      const empresasConceder: { permissaoId: number; nroempresa: number }[] = [];
      const empresasRevogar: { permissaoId: number; nroempresa: number }[] = [];
      for (const permissaoId of chavesEmpresa) {
        const draftSet = draftEmpresas.get(permissaoId) ?? new Set<number>();
        const origSet = originalEmpresas.get(permissaoId) ?? new Set<number>();
        for (const nroempresa of draftSet) if (!origSet.has(nroempresa)) empresasConceder.push({ permissaoId, nroempresa });
        for (const nroempresa of origSet) if (!draftSet.has(nroempresa)) empresasRevogar.push({ permissaoId, nroempresa });
      }

      const codusuario = identidade.codusuario;

      // 1) permissões primeiro (conceder/revogar não conflitam entre si —
      // nenhum id aparece nos dois conjuntos ao mesmo tempo), junto com
      // revogações de empresa (não dependem de nada ter sido concedido).
      await Promise.all([
        ...permissoesConceder.map((id) => api.post(`/administracao/usuarios/${codusuario}/permissoes`, { permissaoId: id })),
        ...permissoesRevogar.map((id) => api.delete(`/administracao/usuarios/${codusuario}/permissoes/${id}`)),
        ...empresasRevogar.map((e) =>
          api.delete(`/administracao/usuarios/${codusuario}/permissoes/${e.permissaoId}/empresas/${e.nroempresa}`),
        ),
      ]);

      // 2) empresas concedidas DEPOIS — se a permissão da página acabou de
      // ser concedida no passo 1, precisa estar commitada antes.
      await Promise.all(
        empresasConceder.map((e) =>
          api.post(`/administracao/usuarios/${codusuario}/permissoes/${e.permissaoId}/empresas`, { nroempresa: e.nroempresa }),
        ),
      );

      const res = await api.get<UsuarioDetalhe>(`/administracao/usuarios/${encodeURIComponent(codusuario)}`);
      aplicarDetalhe(res.data);
      setSalvo(true);
    } catch (err) {
      setErro(isAxiosErrorWithMessage(err) ? err.response!.data.error : 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  }

  const { usuario } = useAuth();
  const { novidadesAberto } = useOutletContext<AppLayoutContext>();
  const tutorial = useTutorial('gestao_permissoes_v1', PASSOS_TUTORIAL);

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

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Gestão de Permissões</h1>
          <p className="text-sm text-ink-muted">Escolha um usuário do Consinco e defina quais páginas — e quais empresas dentro delas — ele pode ver.</p>
        </div>
        <button
          onClick={tutorial.reiniciar}
          title="Rever tutorial desta página"
          aria-label="Rever tutorial desta página"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {erro && (
        <p role="alert" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {erro}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          <div data-tutorial="busca-usuario" className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por nome ou usuário"
              className="w-full rounded-lg border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div
            data-tutorial="lista-usuarios"
            className="flex min-h-[280px] max-h-[480px] flex-col divide-y divide-border overflow-y-auto"
          >
            {buscando && <p className="py-3 text-sm text-ink-muted">Carregando...</p>}
            {!buscando && resultados.length === 0 && <p className="py-3 text-sm text-ink-muted">Nenhum usuário encontrado.</p>}
            {!buscando &&
              resultados.map((u) => (
                <button
                  key={u.codusuario}
                  onClick={() => selecionarUsuario(u)}
                  className={`flex items-center gap-2.5 rounded-lg py-2 text-left transition-colors hover:bg-surface-muted ${
                    identidade?.codusuario === u.codusuario ? 'bg-brand-50' : ''
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      identidade?.codusuario === u.codusuario ? 'bg-brand-500 text-white' : 'bg-surface-muted text-ink-muted'
                    }`}
                  >
                    {iniciais(u.nome)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-ink">{u.nome}</span>
                    {u.totalPermissoes > 0 ? (
                      <span className="w-fit rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">
                        {u.totalPermissoes} {u.totalPermissoes === 1 ? 'página' : 'páginas'}
                        {u.totalEmpresas > 0 ? ` · ${u.totalEmpresas} ${u.totalEmpresas === 1 ? 'empresa' : 'empresas'}` : ''}
                      </span>
                    ) : (
                      <span className="w-fit rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                        Sem acesso
                      </span>
                    )}
                  </span>
                </button>
              ))}
          </div>

          <div className="border-t border-border pt-3">
            <Pagination pagina={pagina} totalPaginas={totalPaginas} total={totalUsuarios} rotuloItem="usuário" onChange={setPagina} disabled={buscando} />
          </div>
        </div>

        <div data-tutorial="painel-edicao" className="rounded-2xl border border-border bg-surface p-5">
          {!identidade && !carregandoDetalhe && (
            <p className="py-10 text-center text-sm text-ink-muted">Selecione um usuário na lista pra editar os acessos dele.</p>
          )}

          {carregandoDetalhe && <p className="py-10 text-center text-sm text-ink-muted">Carregando...</p>}

          {identidade && !carregandoDetalhe && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-semibold text-white">
                    {iniciais(identidade.nome)}
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-ink">{identidade.nome}</h2>
                    <p className="text-sm text-ink-muted">{identidade.codusuario}</p>
                  </div>
                </div>
                <button
                  onClick={fecharPainel}
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <ShieldCheck className="h-4 w-4" />
                  Páginas liberadas
                </h3>
                <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {permissoes.map((permissao) => {
                    const concedida = draftPermissoes.has(permissao.id);
                    const empresasDaPermissao = draftEmpresas.get(permissao.id) ?? new Set<number>();
                    const { Icone, cor } = ICONE_PERMISSAO[permissao.chave] ?? ICONE_PERMISSAO_PADRAO;
                    const filtroEmpresa = filtroEmpresaPorPermissao[permissao.id] ?? '';
                    const empresasFiltradas = empresas.filter((e) =>
                      e.nomereduzido.toLowerCase().includes(filtroEmpresa.trim().toLowerCase()),
                    );
                    const todasMarcadas = empresas.length > 0 && empresasDaPermissao.size === empresas.length;

                    return (
                      <div key={permissao.id} className="px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cor}`}>
                              <Icone className="h-[18px] w-[18px]" />
                            </span>
                            <span className="truncate text-sm font-medium text-ink">{permissao.descricao}</span>
                          </div>
                          <Toggle
                            ligado={concedida}
                            onChange={() => alternarPermissaoDraft(permissao)}
                            label={`Conceder ${permissao.descricao}`}
                          />
                        </div>

                        {concedida && permissao.escopoEmpresa && (
                          <div className="mt-3 ml-12 flex flex-col gap-2 rounded-xl bg-surface-muted p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="flex items-center gap-1 text-xs font-medium text-ink-muted uppercase tracking-wide">
                                <Building2 className="h-3.5 w-3.5" />
                                Empresas nesta página
                                <span className="font-normal normal-case text-[#9aa0a8]">
                                  {empresasDaPermissao.size} de {empresas.length}
                                </span>
                              </p>
                              {empresas.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    todasMarcadas ? desmarcarTodasEmpresas(permissao.id) : marcarTodasEmpresas(permissao.id)
                                  }
                                  className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700"
                                >
                                  {todasMarcadas ? 'Desmarcar todas' : 'Marcar todas'}
                                </button>
                              )}
                            </div>

                            {empresas.length > 6 && (
                              <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted" />
                                <input
                                  value={filtroEmpresa}
                                  onChange={(e) =>
                                    setFiltroEmpresaPorPermissao((prev) => ({ ...prev, [permissao.id]: e.target.value }))
                                  }
                                  placeholder="Filtrar empresa..."
                                  className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                />
                              </div>
                            )}

                            <div className="flex max-h-40 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
                              {empresasFiltradas.length === 0 && (
                                <p className="px-2.5 py-2 text-xs text-ink-muted">Nenhuma empresa encontrada.</p>
                              )}
                              {empresasFiltradas.map((empresa) => {
                                const empresaConcedida = empresasDaPermissao.has(empresa.nroempresa);
                                return (
                                  <label
                                    key={empresa.nroempresa}
                                    className={`flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 text-xs ${
                                      empresaConcedida ? 'font-semibold text-ink' : 'text-ink-muted'
                                    }`}
                                  >
                                    <span>{empresa.nomereduzido}</span>
                                    <input
                                      type="checkbox"
                                      checked={empresaConcedida}
                                      onChange={() => alternarEmpresaDraft(permissao.id, empresa.nroempresa)}
                                      className="h-3.5 w-3.5 accent-brand-500"
                                    />
                                  </label>
                                );
                              })}
                            </div>

                            {!usuario?.isAdmin && (
                              <p className="text-[11px] text-ink-muted">
                                Você só pode conceder, aqui, empresas que você mesmo já tem acesso.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="flex items-center gap-2 border-t border-border pt-4">
                <button
                  onClick={() => void salvarAlteracoes()}
                  disabled={!dirty || salvando}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button
                  onClick={descartarAlteracoes}
                  disabled={!dirty || salvando}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Descartar
                </button>

                {dirty && !salvando && <span className="text-xs text-ink-muted">Alterações não salvas</span>}
                {salvo && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Salvo
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
