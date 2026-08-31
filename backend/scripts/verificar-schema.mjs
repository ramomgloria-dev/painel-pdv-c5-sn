// Script de verificação manual — NÃO faz parte da aplicação, é só um
// utilitário pra conferir o que foi criado no PAINELPDVC5IA depois de rodar
// database/ddl/001_schema.sql e 002_seed_permissoes.sql.
//
// Rodar de dentro de backend/, depois de `npm install`:
//   node scripts/verificar-schema.mjs
//
// Lê as credenciais do backend/.env (mesmas variáveis ORACLE_* da aplicação).
// Só faz SELECT — não altera nada no banco.
import 'dotenv/config';
import oracledb from 'oracledb';

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const TABELAS_ESPERADAS = [
  'TB_ROLES',
  'TB_PERMISSOES',
  'TB_ROLES_PERMISSOES',
  'TB_REGRAS_USUARIOS',
  'TB_USUARIOS_EMPRESAS',
  'TB_LOCAL_ADMIN_CREDENCIAL',
  'TB_TOKENS_REFRESH',
  'TB_INFORMACAOAPLICACAO',
  'TB_VERSOES_APLICACAO',
  'TB_HISTORICOALTERACAO',
  'TB_PROGRESSOTUTORIALUSUARIO',
];

const VIEWS_ESPERADAS = ['VW_USUARIOS', 'VW_MONITORAMENTO', 'VW_EMPRESAS'];

function linha(titulo) {
  console.log(`\n=== ${titulo} ===`);
}

async function main() {
  console.log(`Conectando em ${process.env.ORACLE_CONNECTION_STRING} como ${process.env.ORACLE_USER}...`);

  const connection = await oracledb.getConnection({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
  });
  connection.callTimeout = 10_000;

  try {
    linha('Tabelas — esperadas vs. encontradas');
    const { rows: tabelas } = await connection.execute(
      `SELECT table_name AS "TABLE_NAME" FROM user_tables ORDER BY table_name`,
    );
    const encontradas = new Set(tabelas.map((t) => t.TABLE_NAME));
    for (const esperada of TABELAS_ESPERADAS) {
      console.log(`  [${encontradas.has(esperada) ? 'OK' : 'FALTANDO'}] ${esperada}`);
    }
    const extras = [...encontradas].filter((t) => !TABELAS_ESPERADAS.includes(t));
    if (extras.length > 0) {
      console.log(`  (tabelas extras no schema, não esperadas pelo app: ${extras.join(', ')})`);
    }

    linha('Views (VW_*) — leitura básica');
    for (const view of VIEWS_ESPERADAS) {
      try {
        const { rows } = await connection.execute(
          `SELECT * FROM ${view} WHERE ROWNUM <= 1`,
        );
        const colunas = rows.length > 0 ? Object.keys(rows[0]) : ['(sem linhas retornadas, mas SELECT funcionou)'];
        console.log(`  [OK] ${view} — colunas: ${colunas.join(', ')}`);
      } catch (err) {
        console.log(`  [ERRO] ${view} — ${err.message}`);
      }
    }

    linha('TB_ROLES');
    const { rows: roles } = await connection.execute(`SELECT id AS "ID", codigo AS "CODIGO", nome AS "NOME" FROM tb_roles`);
    console.table(roles);

    linha('TB_PERMISSOES');
    const { rows: permissoes } = await connection.execute(`SELECT id AS "ID", chave AS "CHAVE" FROM tb_permissoes`);
    console.table(permissoes);

    linha('TB_REGRAS_USUARIOS (deve estar vazia por enquanto — admin não vive aqui)');
    const { rows: regras } = await connection.execute(`SELECT codusuario AS "CODUSUARIO", role_id AS "ROLE_ID" FROM tb_regras_usuarios`);
    console.table(regras.length > 0 ? regras : [{ info: 'vazia' }]);

    linha('TB_USUARIOS_EMPRESAS (deve estar vazia por enquanto)');
    const { rows: empresasUsuarios } = await connection.execute(`SELECT codusuario AS "CODUSUARIO", nroempresa AS "NROEMPRESA" FROM tb_usuarios_empresas`);
    console.table(empresasUsuarios.length > 0 ? empresasUsuarios : [{ info: 'vazia' }]);

    linha('CONSINCO.STA_PKG_SEGURANCA.DECODIFICAR — grant de EXECUTE');
    try {
      await connection.execute(`SELECT consinco.sta_pkg_seguranca.decodificar('teste') AS "R" FROM dual`);
      console.log('  [OK] função executou sem erro de privilégio.');
    } catch (err) {
      console.log(`  [ERRO] ${err.message}`);
    }

    console.log('\nVerificação concluída.');
  } finally {
    await connection.close();
  }
}

main().catch((err) => {
  console.error('\nFalha na verificação:', err.message);
  process.exit(1);
});
