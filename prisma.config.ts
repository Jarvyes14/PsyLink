import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Legacy Prisma migrations can still be run manually against a direct URL.
// Vercel only generates the legacy client; it must not connect to PostgreSQL.

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
