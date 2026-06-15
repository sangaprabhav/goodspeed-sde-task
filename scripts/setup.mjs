import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const envPath = resolve(root, '.env');

try {
  await access(envPath, constants.F_OK);
  console.log('Keeping existing .env');
} catch {
  await copyFile(resolve(root, '.env.example'), envPath);
  console.log('Created .env from .env.example');
}

console.log(`
Setup complete.

1. Fill in Supabase and AI credentials in .env.
2. Apply supabase/migrations/001_init.sql through 004_atomic_ingestion.sql.
3. Run pnpm dev.

Run pnpm check before submitting changes.
`);
