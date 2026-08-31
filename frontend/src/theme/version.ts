export const APP_VERSAO = '0.2.0';

export interface EntradaChangelog {
  label: string;
  itens: string[];
}

// Atualizar manualmente a cada release relevante — mesmo hábito usado no
// coletor-app (mobile/src/utils/version.ts). Ordem: mais recente primeiro.
export const CHANGELOG: Record<string, EntradaChangelog> = {
  '0.2.0': {
    label: 'Monitoramento de Caixas renovado',
    itens: [
      'Atualização automática do status dos caixas a cada 30s, sem precisar clicar em "Atualizar".',
      'Caixas agrupados por loja, em seções que abrem/fecham, com grade de quadradinhos coloridos por checkout — melhor pra lojas com muitos caixas.',
      'Gestão de Permissões: um gestor comum só pode conceder, a outros usuários ou a si mesmo, empresas às quais ele já tem acesso.',
      'Login aceita usuário e senha em qualquer combinação de maiúsculas/minúsculas.',
    ],
  },
  '0.1.0': {
    label: 'Lançamento inicial',
    itens: [
      'Login com identidade Consinco e permissões por página.',
      'Monitoramento de Caixas com filtro por empresa, status e número do caixa.',
      'Gestão de Permissões com controle de empresas por página.',
    ],
  },
};
