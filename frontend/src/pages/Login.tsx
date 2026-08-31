import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth, isAxiosErrorWithMessage } from '../auth/AuthContext';
import { LogoMark } from '../components/ui/LogoMark';
import { APP_NOME } from '../theme/brand';

export function Login() {
  const { usuario, carregando, login } = useAuth();
  const [codusuario, setCodusuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!carregando && usuario) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(codusuario, senha);
    } catch (err) {
      setErro(isAxiosErrorWithMessage(err) ? err.response!.data.error : 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="h-1.5 bg-brand-500" />

        <div className="px-8 pb-8 pt-7">
          <div className="mb-8 flex flex-col items-center gap-3">
            <LogoMark size={48} />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-lg font-semibold text-ink">{APP_NOME}</h1>
              <p className="text-sm text-ink-muted">Entre com seu usuário Supernosso</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="codusuario" className="text-sm font-medium text-ink">
                Usuário
              </label>
              <input
                id="codusuario"
                autoComplete="username"
                value={codusuario}
                onChange={(e) => setCodusuario(e.target.value)}
                className="rounded-lg border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="text-sm font-medium text-ink">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2.5 pr-10 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted transition-colors hover:text-ink"
                  aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
                  tabIndex={-1}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <p role="alert" className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
