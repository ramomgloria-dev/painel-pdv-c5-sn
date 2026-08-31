import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useNovidadesModal } from '../ui/NovidadesModal';

export interface AppLayoutContext {
  // Enquanto o modal de novidades está aberto, páginas com tutorial próprio
  // devem esperar ele fechar antes de começar — os dois cobrindo a tela ao
  // mesmo tempo fica confuso.
  novidadesAberto: boolean;
}

export function AppLayout() {
  const novidades = useNovidadesModal();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header novidades={novidades} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ novidadesAberto: novidades.aberto } satisfies AppLayoutContext} />
        </main>
      </div>
    </div>
  );
}
