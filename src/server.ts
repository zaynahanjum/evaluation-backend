import 'dotenv/config';
import app from './app';
import { ensureAppSettings } from './services/prisma.service';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

async function main(): Promise<void> {
  // Ensure singleton AppSettings row exists
  await ensureAppSettings();

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env['NODE_ENV'] ?? 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health\n`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
