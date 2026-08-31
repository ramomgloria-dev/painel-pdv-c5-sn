--------------------------------------------------------------------------------
-- Painel PDV C5 SN — seed inicial do catalogo de permissoes
--
-- Executar DEPOIS de 001_schema.sql, manualmente, por voce.
--
-- Sem seed de usuario/admin aqui — o admin (desenvolvedor) nao vive no
-- banco (ver observacao no final de 001_schema.sql). Quando voce liberar
-- o Painel para o primeiro usuario real (vindo de PAINELPDVC5IA.VW_USUARIOS),
-- atribua a role a ele com:
--
--   INSERT INTO TB_REGRAS_USUARIOS (CODUSUARIO, ROLE_ID, ATRIBUIDO_POR)
--   SELECT '<codusuario>', ID, '<seu_codusuario>' FROM TB_ROLES WHERE CODIGO = 'ADMIN';
--
-- e libere as empresas que ele pode ver com:
--
--   INSERT INTO TB_USUARIOS_EMPRESAS (CODUSUARIO, NROEMPRESA, ATRIBUIDO_POR)
--   VALUES ('<codusuario>', <nroempresa>, '<seu_codusuario>');
--------------------------------------------------------------------------------

INSERT INTO TB_ROLES (CODIGO, NOME, DESCRICAO)
VALUES ('ADMIN', 'Administrador', 'Acesso total ao sistema: todos os menus, paginas, funcionalidades e permissoes, inclusive as criadas no futuro.');

INSERT INTO TB_PERMISSOES (CHAVE, DESCRICAO)
VALUES ('monitoramento_caixas.view', 'Visualizar o Monitoramento de Caixas');

COMMIT;
