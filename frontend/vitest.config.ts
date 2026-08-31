import { defineConfig } from 'vitest/config';

// Config separada do vite.config.ts de propósito: o plugin do Tailwind v4
// (@tailwindcss/vite) depende do binário nativo @tailwindcss/oxide, que
// exige Node >= 20 — quebra ao carregar o config quando o vitest importa
// vite.config.ts direto neste ambiente (Node 18). Os testes aqui não
// processam CSS, então não precisam desse plugin de jeito nenhum.
export default defineConfig({
  plugins: [],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
