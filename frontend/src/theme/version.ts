// Esquema de versão: "AA.M.N" — AA = ano (26 = 2026), M = mês corrente sem
// zero à esquerda (8 = agosto, 9 = setembro...), N = sequencial de release
// DENTRO daquele mês, começando em 1 e reiniciando a cada mês novo. Ex.:
// primeira versão de agosto/2026 = 26.8.1; primeira de setembro = 26.9.1;
// segunda mudança relevante no mesmo setembro = 26.9.2, e assim por diante.
// Facilita saber, só pelo número, quando cada mudança foi lançada — troca o
// semver (0.x.y) que não carregava essa informação.
export const APP_VERSAO = '26.9.1';

export interface EntradaChangelog {
  label: string;
  itens: string[];
}

// Atualizar manualmente a cada release relevante — mesmo hábito usado no
// coletor-app (mobile/src/utils/version.ts). Ordem: mais recente primeiro.
export const CHANGELOG: Record<string, EntradaChangelog> = {
  '26.9.1': {
    label: 'Monitoramento de Caixas renovado',
    itens: [
      'Atualização automática do status dos caixas a cada 30s, sem precisar clicar em "Atualizar".',
      'Caixas agrupados por loja, em seções que abrem/fecham, com grade de quadradinhos coloridos por checkout — melhor pra lojas com muitos caixas.',
      'Gestão de Permissões: um gestor comum só pode conceder, a outros usuários ou a si mesmo, empresas às quais ele já tem acesso.',
      'Login aceita usuário e senha em qualquer combinação de maiúsculas/minúsculas.',
    ],
  },
  '26.8.1': {
    label: 'Lançamento inicial',
    itens: [
      'Login com identidade Consinco e permissões por página.',
      'Monitoramento de Caixas com filtro por empresa, status e número do caixa.',
      'Gestão de Permissões com controle de empresas por página.',
    ],
  },
};
