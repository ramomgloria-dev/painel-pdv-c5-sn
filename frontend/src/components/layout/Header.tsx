import { LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { APP_VERSAO } from '../../theme/version';
import { NovidadesModal, type UseNovidadesModalResult } from '../ui/NovidadesModal';
import { iniciais } from '../../lib/iniciais';

export function Header({ novidades }: { novidades: UseNovidadesModalResult }) {
  const { usuario, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6">
      <button
        onClick={novidades.abrirManualmente}
        className="rounded-md text-xs font-medium text-ink-muted transition-colors hover:text-brand-600 hover:underline"
        title="Ver novidades desta versão"
      >
        Versão {APP_VERSAO}
      </button>

      <NovidadesModal aberto={novidades.aberto} onFechar={novidades.fechar} />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink">
            {usuario ? iniciais(usuario.nome) : ''}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-ink">{usuario?.nome}</span>
            {usuario?.isAdmin && <span className="text-xs text-ink-muted">Administrador</span>}
          </div>
        </div>
        <button
          onClick={() => void logout()}
          className="ml-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}
