# syntax=docker/dockerfile:1

# node:*-slim (Debian/glibc), não alpine: o binário nativo do
# @tailwindcss/oxide usado no build não tem build musl compatível com todo
# ambiente — slim evita esse tipo de problema. Só é usado na etapa de build;
# a imagem final é nginx puro, sem Node nenhum.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1
