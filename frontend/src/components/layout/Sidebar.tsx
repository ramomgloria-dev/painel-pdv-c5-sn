import { NavLink } from 'react-router-dom';
import { LayoutGrid, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { LogoMark } from '../ui/LogoMark';
import { APP_NOME } from '../../theme/brand';

interface MenuItem {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  permissao: string;
}

const MENU_ITEMS: MenuItem[] = [
  { to: '/', label: 'Monitoramento de Caixas', icon: LayoutGrid, permissao: 'monitoramento_caixas.view' },
  { to: '/administracao/permissoes', label: 'Gestão de Permissões', icon: ShieldCheck, permissao: 'usuarios_permissoes.manage' },
];

export function Sidebar() {
  const { temPermissao } = useAuth();
  const itensVisiveis = MENU_ITEMS.filter((item) => temPermissao(item.permissao));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark size={32} />
        <span className="text-sm font-semibold leading-tight text-ink">{APP_NOME}</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {itensVisiveis.length === 0 && (
          <p className="px-2 py-4 text-sm text-ink-muted">Nenhum menu liberado para o seu usuário ainda.</p>
        )}
        {itensVisiveis.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
