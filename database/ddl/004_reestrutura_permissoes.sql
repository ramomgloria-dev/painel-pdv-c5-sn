--------------------------------------------------------------------------------
-- Painel PDV C5 SN — troca de "perfis de acesso" (roles) por permissão
-- direta por página, e empresa liberada por página (não mais global).
--
-- Motivo: só existe 1 perfil (ADMIN) e ninguém além do usuário admin tinha
-- acesso a nada — a indireção de perfil não estava ajudando em nada ainda.
-- Permissão vai direto no usuário. E como cada página pode precisar de um
-- recorte de empresas diferente (ex.: Monitoramento de Caixas hoje, um
-- Relatório amanhã com outro recorte), empresa liberada passa a ser POR
-- PERMISSÃO, não mais global pro usuário inteiro.
--
-- TB_USUARIOS_EMPRESAS já existe e está vazia (conferido antes de escrever
-- isso) — por isso o ALTER TABLE abaixo é seguro. Se já tiver dado quando
-- você for rodar, me avise antes, porque a migração dos dados existentes
-- fica diferente.
--------------------------------------------------------------------------------

-- 1) Marca quais permissões (páginas) fazem sentido ter recorte por
--    empresa. A tela de Gestão de Permissões só mostra a sublista de
--    empresas pras permissões marcadas 'S'.
ALTER TABLE TB_PERMISSOES ADD ESCOPO_EMPRESA CHAR(1) DEFAULT 'N' NOT NULL;
ALTER TABLE TB_PERMISSOES ADD CONSTRAINT CK_TB_PERMISSOES_ESCOPO CHECK (ESCOPO_EMPRESA IN ('S', 'N'));

UPDATE TB_PERMISSOES SET ESCOPO_EMPRESA = 'S' WHERE CHAVE = 'monitoramento_caixas.view';
COMMIT;

-- 2) Concessão direta de permissão por usuário — substitui TB_REGRAS_USUARIOS.
CREATE TABLE TB_USUARIOS_PERMISSOES (
    CODUSUARIO      VARCHAR2(30)    NOT NULL,
    PERMISSAO_ID    NUMBER          NOT NULL,
    ATRIBUIDO_EM    TIMESTAMP       DEFAULT SYSTIMESTAMP NOT NULL,
    ATRIBUIDO_POR   VARCHAR2(30),
    CONSTRAINT PK_TB_USUARIOS_PERMISSOES PRIMARY KEY (CODUSUARIO, PERMISSAO_ID),
    CONSTRAINT FK_USUPERM_PERMISSAO FOREIGN KEY (PERMISSAO_ID) REFERENCES TB_PERMISSOES (ID) ON DELETE CASCADE
);

CREATE INDEX IX_TB_USUARIOS_PERMISSOES_COD ON TB_USUARIOS_PERMISSOES (CODUSUARIO);

-- 3) TB_USUARIOS_EMPRESAS passa a ser por permissão (empresa liberada
--    DENTRO de uma página específica, não mais pro usuário inteiro).
ALTER TABLE TB_USUARIOS_EMPRESAS ADD PERMISSAO_ID NUMBER;

UPDATE TB_USUARIOS_EMPRESAS
   SET PERMISSAO_ID = (SELECT ID FROM TB_PERMISSOES WHERE CHAVE = 'monitoramento_caixas.view')
 WHERE PERMISSAO_ID IS NULL;
COMMIT;

ALTER TABLE TB_USUARIOS_EMPRESAS MODIFY PERMISSAO_ID NOT NULL;
ALTER TABLE TB_USUARIOS_EMPRESAS ADD CONSTRAINT FK_USUEMP_PERMISSAO FOREIGN KEY (PERMISSAO_ID) REFERENCES TB_PERMISSOES (ID) ON DELETE CASCADE;

ALTER TABLE TB_USUARIOS_EMPRESAS DROP CONSTRAINT PK_TB_USUARIOS_EMPRESAS;
ALTER TABLE TB_USUARIOS_EMPRESAS ADD CONSTRAINT PK_TB_USUARIOS_EMPRESAS PRIMARY KEY (CODUSUARIO, PERMISSAO_ID, NROEMPRESA);

--------------------------------------------------------------------------------
-- 4) TB_ROLES / TB_ROLES_PERMISSOES / TB_REGRAS_USUARIOS não são mais
--    usadas pelo app a partir de agora. Deixei comentado — elas não
--    atrapalham em nada ficando paradas (estão vazias, exceto TB_ROLES que
--    só tem a linha 'ADMIN'), mas se preferir tirar do schema:
--
-- DROP TABLE TB_REGRAS_USUARIOS;
-- DROP TABLE TB_ROLES_PERMISSOES;
-- DROP TABLE TB_ROLES;
--------------------------------------------------------------------------------
