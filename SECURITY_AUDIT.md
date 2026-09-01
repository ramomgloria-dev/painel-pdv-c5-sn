# Auditoria de Segurança — Gestão de PDV's (Painel PDV C5 SN)

Data: 01/09/2026. Escopo: repositório completo (`backend/`, `frontend/`, `database/`, Docker, docker-compose). Metodologia: revisão de código estática, leitura integral de todos os módulos de autenticação/autorização/negócio, `npm audit`, build + suíte de testes existente, sem nenhum teste destrutivo, de carga ou brute-force real.

## Resumo Executivo

A aplicação foi construída com preocupação de segurança explícita desde o início (comentários no próprio código citam IDOR, bypass central de admin, timing-safe compare, etc.), e isso se confirma na revisão: autenticação e autorização são feitas inteiramente no backend, cookies de sessão são `httpOnly`+`Secure`+`SameSite=Strict`, todas as queries Oracle usam bind variables, todos os endpoints de escrita usam schemas `zod` explícitos (sem mass assignment), o recorte de dados por empresa é validado server-side (sem IDOR), e não há segredos nem no frontend nem no histórico de git.

O achado mais importante encontrado — e já corrigido nesta sessão — não estava no código da aplicação, e sim na infraestrutura de deploy: um `docker-compose.override.yml` comitado no repositório era aplicado **automaticamente** pelo Docker Compose sempre que alguém rodasse `docker compose up` (o comando de produção documentado no `STATUS.md`), revertendo silenciosamente `NODE_ENV` para `development` e `COOKIE_SECURE` para `false` — exatamente a checagem que `env.ts` foi escrito para impedir. Foi corrigido renomeando o arquivo, o que exige agora uma flag explícita para ser usado.

Fora esse ponto, os achados restantes são de severidade média/baixa: uma inconsistência de autorização em nível de função no módulo de administração (só explorável se o ADMIN um dia delegar a permissão `usuarios_permissoes.manage` a um "gestor comum"), dependências de frontend com CVEs moderados sem exploração óbvia no uso atual, e itens de defesa-em-profundidade (gate client-side da rota administrativa, rate limit em `/refresh`/`/logout`).

## Arquitetura Encontrada

```
Internet / rede corporativa / Wi-Fi
        │
        ▼
  nginx (container "frontend", única porta publicada: 80)
        │  serve o SPA React (build estático)
        │  proxy /api/* -> container "backend":3003 (rede interna Docker)
        ▼
  Express + TypeScript (container "backend", SEM porta publicada ao host)
        │  helmet, CORS restrito a FRONTEND_URL, cookie-parser, rate-limit no login
        │  JWT em cookies httpOnly (access 15min, refresh 7 dias rotacionado)
        ▼
  Oracle (Consinco DESENV20, remoto) — owner PAINELPDVC5IA, só leitura no
  schema Consinco (SELECT em views + EXECUTE em STA_PKG_SEGURANCA.DECODIFICAR)
```

- **Backend**: Node 22 + Express + TypeScript, `oracledb` (thin mode), `jsonwebtoken`, `bcryptjs`, `zod`, `pino`, `helmet`, `express-rate-limit`.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind v4, `react-router-dom`, `axios`.
- **Sem** GraphQL, sem WebSockets, sem Swagger/OpenAPI, sem uploads de arquivo, sem webhooks, sem filas/CRON externos (só um `setInterval` interno de ping).
- **Autenticação**: login contra `painelpdvc5ia.vw_usuarios` (senha decodificada via função Oracle `CONSINCO.STA_PKG_SEGURANCA.DECODIFICAR`, comparação em tempo constante) + identidade "admin" resolvida só via `backend/.env` (nunca em tabela) + tabela local de contingência `tb_local_admin_credencial` (bcrypt).
- **Autorização**: permissão direta por usuário-por-página (`TB_USUARIOS_PERMISSOES`), com recorte de empresa por página (`TB_USUARIOS_EMPRESAS`). ADMIN passa em qualquer checagem via bypass central em `permissions.service.ts`.
- **Rede dos PDVs**: ping periódico em background a ~1300 IPs internos de loja (`vw_pdvoffline`), resultado só em memória, IP nunca exposto a nenhuma resposta de API.

## Superfície de Ataque

- **Publicamente exposto**: apenas o container `frontend` (nginx), porta 80/443 conforme o proxy externo. Backend não tem porta publicada — só é alcançável de dentro da rede Docker do compose.
- **Endpoints HTTP totais**: 13, todos sob `/api/*` + `/health`. Nenhum GraphQL, nenhum admin "escondido" fora dos routers.
- **Autenticação necessária**: todos os endpoints exceto `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` e `GET /health`.
- **Client-side não é tratado como barreira em nenhum lugar do backend** — todo `authorize()` roda no Express, nunca no React.

## Endpoints Públicos

| Método | Rota | Dado retornado | Observação |
| --- | --- | --- | --- |
| GET | `/health` | `{status:"ok"}` | Sem dado sensível. Aceitável público (health-check de container/orquestrador). |
| POST | `/api/auth/login` | Sucesso: usuário+permissões. Falha: mensagem genérica | Rate-limited por IP+usuário. |
| POST | `/api/auth/refresh` | Renova sessão a partir do cookie refresh | Sem rate limit dedicado (ver Vulnerabilidades Baixas). |
| POST | `/api/auth/logout` | 204 | Idempotente, sem rate limit (ok — não sensível). |

## Endpoints Autenticados

| Método | Rota | Permissão exigida | Recorte |
| --- | --- | --- | --- |
| GET | `/api/auth/me` | qualquer sessão válida | — |
| GET | `/api/monitoramento-caixas/status-caixas` | `monitoramento_caixas.view` | por empresa, validado server-side |
| GET | `/api/monitoramento-caixas/empresas` | `monitoramento_caixas.view` | por empresa, validado server-side |

## Endpoints Administrativos

Todos sob `administracaoRouter.use(authenticate, authorize('usuarios_permissoes.manage'))` — sem exceção, sem rota "esquecida" fora desse `use`.

| Método | Rota |
| --- | --- |
| GET | `/api/administracao/usuarios` |
| GET | `/api/administracao/usuarios/:codusuario` |
| POST/DELETE | `/api/administracao/usuarios/:codusuario/permissoes[/:permissaoId]` |
| POST/DELETE | `/api/administracao/usuarios/:codusuario/permissoes/:permissaoId/empresas[/:nroempresa]` |
| GET | `/api/administracao/catalogos` |

## Informações Sensíveis Encontradas

Nenhum segredo, senha, hash, token ou credencial foi encontrado no código-fonte, no bundle do frontend ou no histórico de git (`.env` real nunca foi commitado — confirmado via `git ls-files`; `.gitignore` cobre `**/.env`). Dados classificados:

| Dado | Classificação | Onde vive | Exposto sem auth? |
| --- | --- | --- | --- |
| Senha Consinco decodificada | ALTAMENTE SENSÍVEL | só em memória, nunca logada/persistida/retornada | Não |
| Hash bcrypt do admin | ALTAMENTE SENSÍVEL | só em `backend/.env`, fora do banco e do git | Não |
| JWT secrets | ALTAMENTE SENSÍVEL | só em `backend/.env` | Não |
| IP interno de loja (192.168.x.x) | CONFIDENCIAL | só em memória do backend, nunca em resposta de API | Não |
| Nome/login de usuário Consinco | INTERNO | Oracle, via API autenticada | Não |
| Status de caixa/checkout por loja | INTERNO/CONFIDENCIAL (recorte por empresa) | Oracle, via API autenticada + autorizada | Não |

## Vulnerabilidades Críticas

Nenhuma vulnerabilidade explorável sem decisão humana adicional foi encontrada no código da aplicação em si.

## Vulnerabilidades Altas

**[V1] `docker-compose.override.yml` aplicado automaticamente pelo Docker Compose, revertendo proteção de produção — CORRIGIDO**
- **Arquivo**: `docker-compose.override.yml` (raiz)
- **Impacto**: Docker Compose funde automaticamente qualquer arquivo chamado exatamente `docker-compose.override.yml` com `docker-compose.yml` ao rodar `docker compose up` — sem flag nenhuma. O `STATUS.md` documenta produção como `docker compose up --build` na raiz. Esse override fazia `NODE_ENV=development` e `COOKIE_SECURE=false`, o que **contorna** a checagem de `backend/src/config/env.ts:73-76` (que hoje recusa subir em produção com `COOKIE_SECURE=false`) porque a checagem só dispara quando `NODE_ENV=production` — e o override muda justamente essa variável. Resultado possível em um deploy real seguindo a documentação ao pé da letra: cookies de sessão (JWT access/refresh) trafegando sem `Secure`, ou seja, sujeitos a serem capturados em uma rede não criptografada.
- **Correção aplicada**: arquivo renomeado para `docker-compose.rede-local.yml` (não é mais um nome reservado do Docker Compose) e comentário no topo explicando que agora precisa ser citado explicitamente com `-f`. `docker compose up --build` sozinho (o comando de produção) passa a ignorá-lo, do jeito certo.
- **Risco de regressão**: nenhum — não há nenhuma referência a esse arquivo por nome em nenhum script, README ou pipeline (verificado por busca em todo o repositório). O único uso documentado dele era manual, para teste na rede Wi-Fi local, e continua funcionando, só que agora precisa ser explícito.

## Vulnerabilidades Médias

**[V2] Autorização em nível de função inconsistente dentro do módulo de administração — PRECISA DECISÃO**
- **Arquivo**: `backend/src/modules/administracao/administracao.service.ts` (`concederPermissaoUsuario`, `revogarPermissaoUsuario`, `revogarEmpresaUsuario`)
- **Descrição**: para concessão de **empresa** dentro de uma página (`concederEmpresaUsuario`), o código já restringe corretamente um ator não-ADMIN a só conceder empresas que ele mesmo possui (linhas 142-151 do arquivo). Só que essa mesma restrição **não existe** para conceder/revogar a **permissão da página em si** (`concederPermissaoUsuario`/`revogarPermissaoUsuario`) nem para revogar empresa (`revogarEmpresaUsuario`) — qualquer conta que tenha a permissão `usuarios_permissoes.manage` pode conceder **qualquer** permissão do catálogo a **qualquer** usuário, inclusive `usuarios_permissoes.manage` para terceiros (promovendo outra conta a "gestor" também irrestrito), e pode revogar qualquer permissão/empresa de qualquer usuário, mesmo fora do próprio escopo.
- **Impacto**: hoje, por padrão, **só o ADMIN** (que já ignora toda checagem via bypass central) tem essa permissão — então não há exploração possível sem uma ação humana prévia. Mas se algum dia o ADMIN conceder `usuarios_permissoes.manage` a um "gestor comum" (o próprio comentário do código em `obterCatalogos` já prevê esse cenário, chamando-o de "gestor comum"), esse gestor deixa de ser limitado às empresas dele: ele vira, na prática, equivalente a um segundo ADMIN para fins de permissões — podendo inclusive criar outros gestores irrestritos.
- **Recomendação** (não aplicada — muda comportamento intencional, exige decisão de negócio): espelhar a mesma lógica que já existe para empresa — um ator não-ADMIN só pode conceder/revogar uma permissão que ele mesmo possui (e nunca `usuarios_permissoes.manage` para outra conta, a não ser que seja ADMIN). Antes de implementar, confirmar se algum "gestor comum" (não-ADMIN) já recebeu essa permissão hoje em produção — se sim, a mudança pode remover uma capacidade que já está em uso.
- **Status**: PRECISA DECISÃO.

## Vulnerabilidades Baixas

**[V3] Rota `/administracao/permissoes` sem gate client-side de permissão**
- **Arquivo**: `frontend/src/App.tsx`
- Qualquer usuário autenticado (mesmo sem `usuarios_permissoes.manage`) que digite a URL diretamente vê o esqueleto da tela (título, busca) antes das chamadas de API retornarem 403 com mensagem genérica. Nenhum dado real vaza (o backend bloqueia toda chamada), é só uma questão de polimento de UX/defesa-em-profundidade. `Sidebar.tsx` já esconde corretamente o link do menu.
- **Recomendação**: envolver a rota com uma checagem de `temPermissao('usuarios_permissoes.manage')` no `ProtectedRoute` ou em um wrapper específico, redirecionando para `/` se ausente. Baixo risco, correção simples — não aplicada nesta sessão para não introduzir mudança de roteamento sem validação visual do usuário.

**[V4] `POST /api/auth/refresh` e `POST /api/auth/logout` sem rate limiting dedicado**
- **Arquivo**: `backend/src/modules/auth/auth.routes.ts`
- Só `/login` tem `loginRateLimiter`. Um refresh token só é aceito se assinado com `JWT_REFRESH_SECRET` (256+ bits) e presente/não revogado em `tb_tokens_refresh`, então força bruta é inviável — mas um volume alto de tentativas inválidas ainda gera carga de conexões Oracle (cada tentativa faz `withTransaction`). Severidade baixa.
- **Recomendação**: um rate limit leve por IP (bem mais permissivo que o de login) nessas duas rotas, se algum dia notar abuso nos logs de auditoria.

## Dependências Vulneráveis

**Backend** (`npm audit --omit=dev`): **0 vulnerabilidades**.

**Frontend** (`npm audit`): 7 avisos, todos **moderados**, todos em devDependencies ou em uma lib client-side sem exploração óbvia no uso atual:
- `esbuild <=0.24.2` (via `vite`/`vitest`) — permite que qualquer site envie requisições ao dev server e leia a resposta. **Só afeta `npm run dev`/testes locais**, nunca o build de produção servido pelo nginx.
- `react-router-dom` 6.x — CVE-2025-68470-bypass (open redirect via barra invertida em `<Link>`/`useNavigate`) e uma vulnerabilidade de SSR (não se aplica — a app é SPA client-side, sem SSR). Fix disponível só via `react-router-dom@7` (major, breaking change) — não aplicado nesta sessão para evitar regressão sem teste de todas as rotas; recomenda-se planejar essa migração numa janela dedicada, testando a navegação inteira depois.

## Problemas de Configuração

- Corrigido: `docker-compose.override.yml` (V1, acima).
- `ORACLE_CONNECTION_STRING` sem `CONNECT_TIMEOUT` explícito — já documentado como risco conhecido no `STATUS.md`; não alterado aqui por exigir teste real contra o Oracle de produção antes de mudar timeout de conexão.

## Problemas de Autenticação

Nenhum encontrado. Pontos fortes confirmados na leitura do código: senha nunca comparada em texto puro por igualdade simples (usa `timingSafeStringEqual`), refresh token rotacionado a cada uso e com hash SHA-256 em banco (nunca o token em claro), cookies `httpOnly`+`Secure` (quando `NODE_ENV=production`, agora garantido de verdade)+`SameSite=Strict`, identidade admin nunca em tabela nenhuma.

## Problemas de Autorização

Ver V2 (Vulnerabilidades Médias) — único ponto de atenção, e ainda assim não explorável no estado atual de produção.

## Problemas de API

Nenhum SQLi, mass assignment, ou exposição excessiva de dados encontrado — toda resposta de API mapeia campos explicitamente (nunca `res.json(rowFromDb)` direto), toda escrita usa schema zod com allowlist de campos.

## Possíveis Exposições Externas

Se o domínio público responder da internet: apenas o HTML/JS estático do SPA (React) e a tela de login carregam sem sessão — nenhuma tela de negócio busca dado antes de `GET /api/auth/me` confirmar sessão válida, e mesmo forçando a URL, toda chamada de API exige o cookie `access_token` com assinatura JWT válida verificada no backend. `/health` responde sem autenticação, mas só devolve `{status:"ok"}`.

## Recomendações de Infraestrutura

- Manter o backend sem porta publicada ao host (já é assim) — só o nginx deve ser exposto.
- Se o acesso via internet (fora de VPN/rede corporativa) for uma possibilidade real e não só teórica, considerar colocar a aplicação atrás de VPN corporativa ou de um proxy com SSO, já que hoje a única barreira para alguém de fora tentar login é o rate limiter (bom para brute-force, mas não impede reconhecimento da tela de login).
- Rotacionar `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`ADMIN_SENHA_HASH` se algum desses valores já tiver sido compartilhado fora do `.env` local (ex.: colado em chat) — não há evidência disso no repositório, é só precaução padrão.

## Melhorias Aplicadas

1. **[V1 — Alta]** Renomeado `docker-compose.override.yml` → `docker-compose.rede-local.yml`, com comentário explicando o risco e o novo uso explícito (`docker compose -f docker-compose.yml -f docker-compose.rede-local.yml up`). Build, typecheck e os 18 testes automatizados existentes do backend continuam passando; typecheck do frontend também.

## Melhorias Não Aplicadas e Motivo

- **[V2 — Média]**: restrição de escopo em `concederPermissaoUsuario`/`revogarPermissaoUsuario`/`revogarEmpresaUsuario` — não aplicada porque muda uma capacidade que hoje existe por padrão (mesmo que não usada, já que só ADMIN tem a permissão); precisa confirmação de que nenhum "gestor comum" já depende do comportamento atual antes de restringir.
- **[V3 — Baixa]**: gate client-side na rota `/administracao/permissoes` — não aplicada para não alterar fluxo de navegação sem validação visual do usuário; é cosmético (backend já bloqueia).
- **[V4 — Baixa]**: rate limit em `/refresh`/`/logout` — não aplicada por ser preventiva (sem sinal de abuso hoje) e por exigir escolha de limites que não prejudiquem uso legítimo (ex.: várias abas renovando ao mesmo tempo).
- **Upgrade de `react-router-dom` v6→v7**: não aplicado por ser breaking change que exige teste manual completo de toda a navegação da SPA.
- **`ORACLE_CONNECTION_STRING` sem `CONNECT_TIMEOUT`**: não aplicado por exigir teste contra o Oracle real de produção.

## Testes Executados

- `cd backend && npm run build` — sucesso, sem erros de TypeScript.
- `cd backend && npm test` (vitest) — 4 arquivos, 18 testes, todos passando (inclui testes de `timingSafeCompare`, rate limiter, `auth.service`, `administracao.service`).
- `cd frontend && npm run lint` (`tsc --noEmit`) — sem erros.
- `cd backend && npm audit --omit=dev` — 0 vulnerabilidades.
- `cd frontend && npm audit` — 7 moderadas (detalhado acima), 0 críticas/altas.
- Revisão manual de 100% dos arquivos `.ts`/`.tsx` do backend e do frontend (todos os módulos: auth, permissions, administracao, monitoramento-caixas, audit, middlewares, utils; e no frontend: App, AuthContext, ProtectedRoute, api.ts, Login, MonitoramentoCaixas, AdministracaoPermissoes, Sidebar, Header, AppLayout, useTutorial).
- Busca por padrões: `TODO`/`FIXME`/`bypass`/`disable auth`/`dev only` (nenhum encontrado fora de comentários explicando o bypass *intencional* do admin), `eval`/`innerHTML`/`dangerouslySetInnerHTML` (nenhum encontrado), segredos no bundle/git (nenhum encontrado, `.env` real confirmado fora do controle de versão).
- Não foram executados: testes de carga, brute-force real, ou qualquer ataque contra o Oracle de produção (fora do escopo autorizado desta auditoria).

## Riscos Remanescentes

- V2 (autorização em nível de função na administração) permanece como decisão de produto em aberto.
- Dependências moderadas do frontend (react-router-dom, cadeia esbuild/vite em dev) seguem sem correção até uma janela dedicada de upgrade com teste manual.
- `ORACLE_CONNECTION_STRING` sem timeout de conexão explícito (risco operacional, não de segurança direta).
- Rate limiter de login em memória por processo — só vira problema se o backend rodar em modo cluster/múltiplas réplicas (não é o caso hoje).

## Recomendações Futuras

1. Decidir e, se aprovado, implementar a restrição de escopo do V2 antes de qualquer plano de delegar `usuarios_permissoes.manage` a alguém além do ADMIN.
2. Planejar upgrade de `react-router-dom` para v7 numa janela com teste manual completo da navegação.
3. Adicionar teste automatizado de integração cobrindo o cenário do V1 (ex.: um teste que falha se `NODE_ENV=production` e `COOKIE_SECURE` puder ser `false` por qualquer combinação de arquivos compose), para essa classe de erro não voltar a acontecer silenciosamente.
4. Quando as etapas pendentes 7-10 do roteiro original (versionamento, tutorial, testes, auditoria final) forem retomadas, incluir testes de autorização automatizados (ex.: requisição sem cookie, cookie de usuário sem permissão, tentativa de acessar empresa fora do escopo) no CI, hoje inexistentes.

---

## Matriz de Risco

| ID | Vulnerabilidade | Severidade | Arquivo | Endpoint | Impacto | Status |
| --- | --- | --- | --- | --- | --- | --- |
| V1 | `docker-compose.override.yml` auto-aplicado revertia `NODE_ENV`/`COOKIE_SECURE` em produção | ALTA | `docker-compose.override.yml` | N/A (infra) | Cookies de sessão sem `Secure` em produção se deploy seguisse a doc ao pé da letra | CORRIGIDO |
| V2 | Sem restrição de escopo ao conceder/revogar permissão (só empresa é restrita) | MÉDIA | `backend/src/modules/administracao/administracao.service.ts` | `POST/DELETE /api/administracao/usuarios/:codusuario/permissoes[...]` | Um futuro "gestor comum" viraria administrador irrestrito de permissões | PRECISA DECISÃO |
| V3 | Rota administrativa sem gate client-side de permissão | BAIXA | `frontend/src/App.tsx` | `/administracao/permissoes` (rota SPA) | Nenhum dado vaza; só exibe esqueleto de tela antes do 403 | PRECISA CORRIGIR (opcional) |
| V4 | `/auth/refresh` e `/auth/logout` sem rate limit dedicado | BAIXA | `backend/src/modules/auth/auth.routes.ts` | `POST /api/auth/refresh`, `POST /api/auth/logout` | Carga extra no Oracle em caso de abuso; brute-force inviável (JWT assinado) | ACEITÁVEL |
| V5 | Dependências moderadas (`react-router-dom`, cadeia `esbuild`/`vite` em dev) | BAIXA | `frontend/package.json` | N/A | Open redirect teórico (sem uso de redirect por parâmetro na app); dev-server só em ambiente local | ACEITÁVEL (monitorar) |
| V6 | `ORACLE_CONNECTION_STRING` sem `CONNECT_TIMEOUT` | INFORMATIVA | `backend/.env.example` | N/A | Inicialização pode travar se Oracle cair no boot | ACEITÁVEL (já documentado) |
| V7 | Rate limiter de login em memória por processo | INFORMATIVA | `backend/src/middlewares/rateLimit.ts` | `POST /api/auth/login` | Só relevante se escalar para múltiplas instâncias | ACEITÁVEL (já documentado) |

---

## Teste Mais Importante — Respostas Objetivas

1. **Pessoa que descubra a URL pela internet consegue visualizar informação sem autenticação?** NÃO — só o SPA estático e `/health` (sem dado sensível) respondem sem sessão.
2. **Pessoa sem usuário consegue consultar diretamente alguma API?** NÃO, exceto `/health` (sem dado sensível) e as próprias `/auth/login|refresh|logout` (que não retornam dado de negócio sem sucesso).
3. **Autenticado consegue acessar dados de outro usuário alterando IDs?** NÃO — testado no filtro de empresas do monitoramento (`ForbiddenError` se IDs fora do escopo); autorização sempre recalculada server-side a partir do `codusuario` do JWT, nunca de parâmetro da requisição.
4. **Usuário comum consegue chamar endpoints administrativos diretamente?** NÃO — `authorize('usuarios_permissoes.manage')` bloqueia no Express antes de qualquer lógica.
5. **Existem endpoints que confiam em info enviada pelo frontend para permissões?** NÃO — `isAdmin`/permissões sempre vêm do JWT verificado por assinatura ou de consulta ao banco.
6. **Informação sensível dentro do JS enviado ao navegador?** NÃO encontrada.
7. **Existe secret/senha/token/chave no frontend?** NÃO.
8. **Existe credencial no repositório?** NÃO (`.env` real fora do git, confirmado).
9. **Endpoint que deveria ser interno mas está exposto publicamente?** PARCIAL — só `/health`, sem dado sensível; aceitável.
10. **Existe Swagger/OpenAPI/GraphQL Playground/debug/painel administrativo público?** NÃO.
11. **É possível enumerar clientes, usuários ou registros?** PARCIAL — busca paginada de usuários existe, mas só acessível a quem já tem `usuarios_permissoes.manage` (funcionalidade prevista, não falha).
12. **Risco de SQL Injection?** NÃO — bind variables em 100% das queries revisadas.
13. **Risco de XSS?** NÃO — sem `dangerouslySetInnerHTML`/`innerHTML`/`eval`.
14. **Risco de CSRF?** NÃO (mitigado) — `SameSite=Strict` + CORS restrito à origin exata + credentials.
15. **Risco de SSRF?** NÃO — único ponto de rede (ping) usa IP do próprio banco, nunca de input do usuário, via `execFile`.
16. **Risco de mass assignment?** NÃO — schemas zod com allowlist em todo endpoint de escrita.
17. **Risco de privilege escalation?** PARCIAL — ver V2; não explorável hoje (só ADMIN tem a permissão relevante), mas vira risco real se essa permissão for delegada no futuro sem a correção recomendada.
18. **Existe dependência crítica vulnerável?** NÃO no backend (0 vulnerabilidades). Frontend tem avisos moderados, nenhum crítico/alto.
19. **Configuração de desenvolvimento ativa em produção?** Era um risco real (V1) — CORRIGIDO nesta sessão.
20. **Alguém fora da rede da empresa, o que consegue obter?** O HTML/JS estático do SPA e a tela de login; nenhum dado de negócio, já que toda chamada de API exige cookie de sessão com JWT assinado e verificado no backend.
