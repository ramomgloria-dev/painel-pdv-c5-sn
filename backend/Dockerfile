# syntax=docker/dockerfile:1

# ── deps: instala TODAS as dependências (dev incluído) só pra poder buildar ──
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build: compila TypeScript -> dist/ ───────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ── deps de produção: só o necessário pra rodar ──────────────────────────────
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── runtime: imagem final, enxuta, sem toolchain de build ───────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# node-oracledb roda em modo "thin" por padrão (sem Oracle Instant Client) —
# se algum dia for preciso o modo "thick" (ex.: recurso específico de NLS),
# instalar o Instant Client aqui e chamar oracledb.initOracleClient() no
# código antes de abrir o pool.
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Não roda como root.
USER node

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3003}/health || exit 1

CMD ["node", "dist/server.js"]
