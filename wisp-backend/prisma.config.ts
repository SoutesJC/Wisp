import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Import: process.env direto, não o helper `env()`. `env()` lança erro se a
// variável não existir, e TODO comando do Prisma CLI carrega esse arquivo —
// inclusive `generate`, que não precisa de um banco real. Sem esse fallback,
// `npm install` (que roda `prisma generate` via postinstall) falha num clone
// novo antes mesmo de existir um `.env`.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  },
});
