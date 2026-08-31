--------------------------------------------------------------------------------
-- Painel PDV C5 SN — permissão da tela de Gestão de Permissões
--
-- Executar DEPOIS de 002_seed_permissoes.sql (que você já rodou). Só
-- adiciona a chave nova — não repete o que já foi inserido antes.
--
-- Só ADMIN acessa essa tela por padrão (bypass central, sem precisar de
-- linha em TB_ROLES_PERMISSOES). Se um dia você quiser dar essa permissão
-- pra outro perfil, faça pela própria tela — ela também gerencia roles.
--------------------------------------------------------------------------------

INSERT INTO TB_PERMISSOES (CHAVE, DESCRICAO)
VALUES ('usuarios_permissoes.manage', 'Gerenciar perfis e empresas liberadas para os usuários');

COMMIT;
