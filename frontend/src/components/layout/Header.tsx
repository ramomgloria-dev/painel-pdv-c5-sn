import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { APP_VERSAO } from '../../theme/version';
import { NovidadesModal, type UseNovidadesModalResult } from '../ui/NovidadesModal';
import { iniciais } from '../../lib/iniciais';

export function Header({ novidades, onAbrirMenu }: { novidades: UseNovidadesModalResult; onAbrirMenu: () => void }) {
  const { usuario, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b border-border bg-surface px-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onAbrirMenu}
          aria-label="Abrir menu"
          className="shrink-0 rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={novidades.abrirManualmente}
          className="truncate rounded-md text-xs font-medium text-ink-muted transition-colors hover:text-brand-600 hover:underline"
          title="Ver novidades desta versão"
        >
          Versão {APP_VERSAO}
        </button>
      </div>

      <NovidadesModal aberto={novidades.aberto} onFechar={novidades.fechar} />

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2.5 sm:flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink">
            {usuario ? iniciais(usuario.nome) : ''}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-ink">{usuario?.nome}</span>
            {usuario?.isAdmin && <span className="text-xs text-ink-muted">Administrador</span>}
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink sm:hidden">
          {usuario ? iniciais(usuario.nome) : ''}
        </span>
        <button
          onClick={() => void logout()}
          aria-label="Sair"
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink sm:ml-1 sm:px-2.5"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
