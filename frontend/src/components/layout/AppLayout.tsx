import { useState } from 'react';
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
  const [sidebarAberta, setSidebarAberta] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} />
      {/* min-w-0: sem isso, um filho flex nunca encolhe abaixo do conteúdo
          "natural" dele — se algo lá dentro for largo, empurra a página
          inteira e cria rolagem horizontal, mesmo em telas pequenas. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header novidades={novidades} onAbrirMenu={() => setSidebarAberta(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <Outlet context={{ novidadesAberto: novidades.aberto } satisfies AppLayoutContext} />
        </main>
      </div>
    </div>
  );
}
