/**
 * Database migration runner for Cloudflare D1
 * Uses raw SQL files for D1 compatibility
 */

export interface Migration {
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    name: '0001_initial_auth_schema',
    sql: await import('./0001_initial_auth_schema.sql', { with: { type: 'text' } }).then(m => m.default),
  },
];

export async function runMigrations(db: D1Database): Promise<void> {
  // Create migrations tracking table if not exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  // Get applied migrations
  const applied = await db.prepare('SELECT name FROM _migrations').all<{ name: string }>();
  const appliedNames = new Set(applied.results.map(r => r.name));

  // Apply pending migrations
  for (const migration of migrations) {
    if (!appliedNames.has(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);
      
      // Split SQL into individual statements and execute
      const statements = migration.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const stmt of statements) {
        try {
          await db.exec(stmt);
        } catch (error) {
          console.error(`Error executing statement: ${stmt.substring(0, 100)}...`);
          throw error;
        }
      }
      
      // Record migration
      await db.prepare('INSERT INTO _migrations (name) VALUES (?)').bind(migration.name).run();
      console.log(`Migration applied: ${migration.name}`);
    }
  }
}

// CLI runner for local development
export async function main(): Promise<void> {
  const env = process.env;
  
  if (!env.AUTH_D1_DATABASE) {
    console.error('AUTH_D1_DATABASE environment variable is required');
    process.exit(1);
  }
  
  console.log('Running migrations...');
  console.log('Note: For local development, use `wrangler d1 migrations` command instead');
}

// Only run if executed directly
main().catch(console.error);
