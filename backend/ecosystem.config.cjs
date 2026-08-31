// PM2 (WSL2, sem Docker) — mesmo padrao operacional dos demais paineis.
//
// Diferente do ecosystem.config.cjs do Monitoramento-Sefaz, este arquivo
// propositalmente NAO contem segredos (senha Oracle, JWT secret etc.).
// Esses valores ficam only em backend/.env (fora do git) e sao carregados
// via dotenv em tempo de execucao — evita expor credenciais em um arquivo
// de configuracao versionavel.
module.exports = {
  apps: [
    {
      name: 'painel-pdv-c5-sn-backend',
      script: 'npx',
      args: 'tsx src/server.ts',
      cwd: '/home/ramomgloria/painel-pdv-c5-sn/backend',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
