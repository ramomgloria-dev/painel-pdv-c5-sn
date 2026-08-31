import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // envia/recebe os cookies httpOnly de sessão
});

let refreshPromise: Promise<void> | null = null;

async function tentarRenovarSessao(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = api.post('/auth/refresh').then(
      () => {
        refreshPromise = null;
      },
      (err: unknown) => {
        refreshPromise = null;
        throw err;
      },
    );
  }
  return refreshPromise;
}

// Se o access token expirou (401), tenta renovar via refresh token uma
// única vez e repete a requisição original — assim o usuário não precisa
// perceber a renovação em uso normal do painel.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    // Nunca tenta renovar sessão a partir de uma falha no próprio
    // login/refresh — evita loop (refresh falhou -> tenta refresh de novo).
    // /auth/me também fica de fora: é a checagem silenciosa que o
    // AuthProvider faz a cada carregamento da página pra saber se já existe
    // sessão — um 401 aí é só "ainda não logado", não "sessão expirou no
    // meio do uso". Se isso disparasse o redirect forçado abaixo, toda
    // visita sem sessão (inclusive a própria /login) recarregaria a página
    // em loop infinito.
    const isBootstrapOrTokenEndpoint =
      original?.url === '/auth/login' || original?.url === '/auth/refresh' || original?.url === '/auth/me';

    if (error.response?.status === 401 && original && !original._retry && !isBootstrapOrTokenEndpoint) {
      original._retry = true;
      try {
        await tentarRenovarSessao();
        return api(original);
      } catch {
        window.location.assign('/login');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
