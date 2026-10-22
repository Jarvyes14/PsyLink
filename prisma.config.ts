import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI uses a session/direct connection for migrations. The app itself
// continues to use DATABASE_URL, which is pooled on Vercel.
if (process.env.VERCEL === '1' && !process.env.DIRECT_URL) {
  throw new Error('Configura DIRECT_URL con el Session pooler de Supabase antes de desplegar en Vercel.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
