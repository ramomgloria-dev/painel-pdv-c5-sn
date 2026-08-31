# Status — Gestão de PDV's (ex-Painel PDV C5 SN)

Documento de retomada. Última atualização: 28/08/2026.

## Stack

- **Backend**: Node.js + Express + TypeScript, `oracledb` (modo thin, sem Instant Client), JWT (cookies httpOnly), bcryptjs, zod, pino, helmet, express-rate-limit.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind v4, react-router-dom, axios, lucide-react.
- **Banco**: Oracle (Consinco `DESENV20`), owner próprio `PAINELPDVC5IA` (só leitura no schema Consinco — `SELECT` nas views + `EXECUTE` em `CONSINCO.STA_PKG_SEGURANCA`).
- **Deploy**: Docker (multi-stage; backend `node:22-alpine`, frontend build `node:22-slim` + runtime `nginx:1.27-alpine`) — `docker-compose.yml` na raiz. Dev local roda direto com `npm run dev` nos dois lados (sem Docker).

## O que já está pronto

**Autenticação** (`backend/src/modules/auth`)
- Login contra `painelpdvc5ia.vw_usuarios` (colunas: `nome`, `codusuario`, `senha`) — senha decodificada chamando `CONSINCO.STA_PKG_SEGURANCA.DECODIFICAR` direto no Oracle (nunca reimplementada em JS), comparada em tempo constante.
- Usuário `admin` (acesso do desenvolvedor) **não existe em nenhuma tabela** — identidade, hash da senha (bcrypt) e status de admin vêm só de `backend/.env` (`ADMIN_CODUSUARIO` / `ADMIN_SENHA_HASH`), resolvidos num único ponto do código (`auth.service.ts`). Diferente do NF-EntradaSN-main, que tem a senha do admin hardcoded em texto puro espalhada em vários `if`.
- Access token (15 min) + refresh token (7 dias, rotacionado a cada uso) em cookies `httpOnly` + `Secure` + `SameSite=Strict`. Rate limit no `/auth/login`. Toda tentativa de login/logout/acesso negado vai pra `TB_INFORMACAOAPLICACAO` (auditoria).

**Permissões** (`backend/src/modules/permissions`, `backend/src/modules/administracao`)
- Modelo final (depois de uma reestruturação no meio do desenvolvimento): **permissão direta por usuário por página**, sem camada de "perfis" — `TB_USUARIOS_PERMISSOES` (codusuario + permissao_id). `TB_ROLES` / `TB_ROLES_PERMISSOES` / `TB_REGRAS_USUARIOS` existem no banco mas **não são mais usadas pelo app** (dá pra dropar quando quiser, script comentado em `004_reestrutura_permissoes.sql`).
- Empresa liberada é **por página**, não mais global pro usuário — `TB_USUARIOS_EMPRESAS` agora tem `PERMISSAO_ID`. `TB_PERMISSOES.ESCOPO_EMPRESA` (`S`/`N`) marca quais páginas usam recorte de empresa (hoje só `monitoramento_caixas.view`).
- ADMIN (o do `.env`) passa em qualquer checagem de permissão/empresa por bypass central (`permissions.service.ts`) — nunca precisa de linha em tabela nenhuma, inclusive pra permissões criadas no futuro.
- Tela **Gestão de Permissões** (`/administracao/permissoes`): busca paginada de usuários do Consinco (a view tem **1.039 linhas** — por isso é busca, não lista solta), edição em **rascunho local + botão "Salvar alterações"** explícito (sem autosave no clique do checkbox), checkboxes de páginas e, quando a página tem `ESCOPO_EMPRESA='S'`, sublista de empresas dentro dela. Só acessa quem tem a permissão `usuarios_permissoes.manage` (por padrão só o admin).

**Monitoramento de Caixas** (`backend/src/modules/monitoramento-caixas`)
- Lê `painelpdvc5ia.vw_monitoramento` (`nroempresa`, `nomereduzido`, `nrocheckout`, `especie`, `status`).
- Filtros: empresa (dropdown multi-seleção pesquisável, com debounce de 450ms pra não disparar uma requisição por clique), status (multi-seleção, client-side), Nº Caixa (texto, client-side). Empresa é o único filtro validado no backend (recorte de segurança); status/Nº Caixa são client-side de propósito.
- Caixas agrupados por loja em seções que abrem/fecham, com grade de quadradinhos por checkout coloridos por status (não é mais tabela paginada) — ver `frontend/src/pages/MonitoramentoCaixas.tsx` e `monitoramentoCaixas.utils.ts`.
- Atualização automática a cada 30s (`INTERVALO_ATUALIZACAO_MS`), pausa quando a aba perde o foco.
- Cartões de resumo por status no topo, mais tutorial guiado (primeira visita ou botão de ajuda) e modal de novidades por versão — ambos client-side (`localStorage`), sem tabela no banco (ver `frontend/src/hooks/useTutorial.ts`, `frontend/src/components/ui/NovidadesModal.tsx`, `frontend/src/theme/version.ts`).
- **Indicador de PDV offline**: `painelpdvc5ia.vw_pdvoffline` dá `nroempresa`/`nrocheckout`/`ip` de ~1300 checkouts (IPs internos `192.168.x.x` por loja). O backend pinga todos periodicamente em background (`statusRede.service.ts` + `pingPdv.ts`) e guarda o resultado **só em memória** (sem tabela nova no Oracle) — `GET /status-caixas` anota cada caixa com `online: boolean | null`. Controlado por `PDV_PING_HABILITADO`/`PDV_PING_INTERVALO_MS`/`PDV_PING_TIMEOUT_S`/`PDV_PING_CONCORRENCIA` no `.env` (ver `.env.example`).
  - **Importante pro próximo ambiente**: `PDV_PING_HABILITADO=true` só funciona se o servidor onde o backend roda tiver rota de rede até as lojas (confirmado que o WSL2/dev local NÃO tem — por isso está `false` no `.env` local). Testado que `ping` funciona dentro do container Alpine como usuário não-root, sem `cap_add` extra — só falta a rota de rede em si em cada ambiente novo.
  - Achado de bug relacionado: `z.coerce.boolean()` no `env.ts` tratava `"false"` (string) como `true` (`Boolean("false") === true` em JS) — afetava também `COOKIE_SECURE`/`LOG_PRETTY`. Corrigido com um parser de string próprio (`booleanoEnv`).

**Visual**
- Nome: **"Gestão de PDV's"** (trocado de "Painel PDV C5 SN" em todo lugar visível — título da aba, sidebar, login). Pasta do projeto e `package.json` continuam com o nome antigo de propósito (evita quebrar scripts/PM2 sem necessidade).
- Ícone: badge quadrado vermelho com ícone de storefront (Lucide `Store`) — o coração antigo saiu por ficar com cara de app de consumidor, não de ferramenta interna.
- Paleta baseada na logo do Supernosso: vermelho (~`#E31E24`) só como destaque/ação, nunca fundo dominante.

**Docker**
- `backend/Dockerfile`, `frontend/Dockerfile` + `frontend/nginx.conf`, `docker-compose.yml` na raiz — testados de verdade aqui (build + boot dos dois containers). Corrigi dois bugs reais nesse processo: `pino-pretty` (devDependency) derrubava o processo em produção porque a escolha de usar ele dependia de `NODE_ENV` em vez de uma flag própria; e o nginx recusava subir porque `proxy_pass` resolvia o hostname do backend uma vez só, na subida (troquei pra resolver via DNS interno do Docker a cada requisição).
- Backend não fica exposto ao host — só o container do frontend/nginx é publicado.

## Scripts SQL já rodados (nessa ordem, por você, no `PAINELPDVC5IA`)

1. `database/ddl/001_schema.sql` — schema base.
2. `database/ddl/002_seed_permissoes.sql` — catálogo inicial (`monitoramento_caixas.view`).
3. `database/ddl/003_seed_permissao_administracao.sql` — permissão `usuarios_permissoes.manage`.
4. `database/ddl/004_reestrutura_permissoes.sql` — troca de perfis por permissão direta + empresa por permissão.

Não rodei nenhum desses eu mesmo — só escrevi pra você revisar e rodar, como combinado desde o início.

**Pendente de revisão/execução**: `database/ddl/005_fix_vw_monitoramento_caixa_fechado.sql` — corrige a `VW_MONITORAMENTO` pra caixas fechados há 1-3 dias (sem nenhum documento ainda hoje) sumirem do painel, porque o filtro original exigia `dtamovimento = trunc(sysdate)`. Diagnosticado em 31/08/2026 com os casos reais de empresa 56 caixa 1 e empresa 72 caixa 1.

## Como rodar

**Dev local** (sem Docker):
```
cd backend && npm run dev    # porta 3003
cd frontend && npm run dev   # porta 5173, proxy /api -> 3003
```
Precisa de `backend/.env` preenchido (copiar de `.env.example`) com `ORACLE_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_SENHA_HASH` reais.

**Verificar o schema no banco**: `cd backend && node scripts/verificar-schema.mjs` (lê as tabelas/views esperadas e confere se batem com o que existe).

**Produção**: `docker compose up --build` na raiz, com `backend/.env` preenchido (`COOKIE_SECURE=true`, `COOKIE_DOMAIN` e `FRONTEND_URL` apontando pro domínio real).

## Pendente (roteiro original, etapas 5/7/8/9/10)

- **Etapa 5 (layout)**: só fiz o essencial (sidebar, header, login, marca). Não fiz uma auditoria completa de responsividade/acessibilidade em todas as telas.
- **Etapa 7 (versionamento)**: tabelas `TB_VERSOES_APLICACAO` / `TB_HISTORICOALTERACAO` existem no banco, sem nenhum código usando ainda.
- **Etapa 8 (tutorial interativo)**: `TB_PROGRESSOTUTORIALUSUARIO` existe, sem nenhum código usando ainda.
- **Etapa 9 (testes automatizados)**: nenhum teste escrito ainda (nem unitário, nem de integração/API).
- **Etapa 10 (auditoria final)**: não feita.

## Riscos/observações conhecidas (pra não esquecer)

- Rate limiter do login é em memória, por processo — se um dia o backend rodar em modo cluster/múltiplas instâncias, precisa trocar por um store compartilhado (Redis).
- `ORACLE_CONNECTION_STRING` não tem `CONNECT_TIMEOUT` explícito — se o Oracle cair, a inicialização do backend pode ficar tentando conectar por um bom tempo antes de falhar.
- `TB_ROLES` / `TB_ROLES_PERMISSOES` / `TB_REGRAS_USUARIOS` estão paradas no banco (não usadas) — considerar dropar ou reaproveitar futuramente.
