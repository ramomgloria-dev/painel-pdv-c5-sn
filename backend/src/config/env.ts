import 'dotenv/config';
import { z } from 'zod';

// z.coerce.boolean() faz Boolean(valor) por baixo dos panos — e Boolean("false")
// é `true` em JS (qualquer string não-vazia é truthy). Isso faz "false" no
// .env virar `true` silenciosamente. Usar sempre isto pra booleano vindo de
// variável de ambiente.
function booleanoEnv(padrao: boolean) {
  return z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? padrao : v.trim().toLowerCase() === 'true'));
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3003),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  ORACLE_USER: z.string().min(1),
  ORACLE_PASSWORD: z.string().min(1),
  ORACLE_CONNECTION_STRING: z.string().min(1),
  ORACLE_POOL_MIN: z.coerce.number().int().positive().default(2),
  ORACLE_POOL_MAX: z.coerce.number().int().positive().default(10),
  ORACLE_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET precisa ter pelo menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // Acesso do desenvolvedor (equivalente ao "admin" do NF-EntradaSN) — não
  // vive em NENHUMA tabela do banco, só aqui. SENHA_HASH é bcrypt, nunca a
  // senha em texto puro (ver backend/.env.example para gerar o hash).
  ADMIN_CODUSUARIO: z.string().min(1).default('admin'),
  ADMIN_SENHA_HASH: z.string().min(20, 'ADMIN_SENHA_HASH precisa ser um hash bcrypt válido'),

  COOKIE_DOMAIN: z.string().min(1),
  COOKIE_SECURE: booleanoEnv(false),

  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),

  LOG_LEVEL: z.string().default('info'),
  // false por padrão: pino-pretty é devDependency, não existe na imagem
  // Docker de produção. Ligar só em dev local (ver .env.example).
  LOG_PRETTY: booleanoEnv(false),

  // ── Verificação de rede dos PDVs (ping) ──────────────────────────────────
  // Depende do ambiente ter rota até a rede das lojas (192.168.x.x) — nem
  // todo ambiente tem isso (ex.: dev local não tem). Desligar aqui só para
  // ambientes sem essa rota, sem precisar mexer em código.
  PDV_PING_HABILITADO: booleanoEnv(true),
  PDV_PING_INTERVALO_MS: z.coerce.number().int().positive().default(300_000),
  PDV_PING_TIMEOUT_S: z.coerce.number().int().positive().default(1),
  PDV_PING_CONCORRENCIA: z.coerce.number().int().positive().default(50),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Configuração inválida em .env:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  console.error('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET não podem ser iguais em produção.');
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && !parsed.data.COOKIE_SECURE) {
  console.error('COOKIE_SECURE precisa ser true em produção (cookies só devem trafegar em HTTPS).');
  process.exit(1);
}

export const env = parsed.data;
