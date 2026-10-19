// @ts-ignore
import { PrismaClient, Prisma } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

export { Prisma };

const { Pool } = pg;

// Use a module-level singleton to avoid creating multiple connections
// (especially important in development with tsx watch)
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis.__prismaClient ?? (globalThis.__prismaClient = createPrismaClient());

/**
 * Initialise the AppSettings singleton row if it doesn't exist yet.
 * Call once at server startup.
 */
export async function ensureAppSettings(): Promise<void> {
  await prisma.appSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', submissionLocked: false, updatedAt: new Date() },
    update: {},
  });
}
