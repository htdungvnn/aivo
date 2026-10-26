import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";

/**
 * A D1-shaped facade over an in-memory SQLite database.
 *
 * The API is written against D1, but D1 cannot be opened outside a Worker.
 * This adapter lets the tests exercise the real Better Auth code paths
 * against a real SQL engine, using the same D1 dialect the Worker uses.
 *
 * The schema is created from the same generated migrations the Worker
 * applies, so the tests run against the production schema.
 */
export function createTestDatabase(schemaSql: string) {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(schemaSql);

  type Statement = {
    bind(...values: SQLInputValue[]): Statement;
    all<T>(): Promise<{ results: T[]; meta: { changes: number; last_row_id: number } }>;
    run<T>(): Promise<{ results: T[]; meta: { changes: number; last_row_id: number } }>;
    first<T>(): Promise<T | null>;
  };

  function createStatement(sql: string): Statement {
    let bound: SQLInputValue[] = [];

    const statement: Statement = {
      bind(...values: SQLInputValue[]) {
        bound = values;
        return statement;
      },
      async all<T>() {
        const rows = sqlite.prepare(sql).all(...bound) as T[];
        return { results: rows, meta: { changes: 0, last_row_id: 0 } };
      },
      async run<T>() {
        const result = sqlite.prepare(sql).run(...bound);
        return {
          results: [] as T[],
          meta: {
            changes: Number(result.changes),
            last_row_id: Number(result.lastInsertRowid),
          },
        };
      },
      async first<T>() {
        const rows = sqlite.prepare(sql).all(...bound) as T[];
        return rows[0] ?? null;
      },
    };

    return statement;
  }

  return {
    sqlite,
    prepare: createStatement,
    /**
     * D1 runs every statement in the batch and returns one result per
     * statement. The statements are executed in order.
     */
    async batch(statements: Statement[]) {
      return Promise.all(statements.map((statement) => statement.all()));
    },
    async exec(sql: string) {
      sqlite.exec(sql);
      return undefined;
    },
  };
}

/**
 * The production schema, read from the generated migrations.
 *
 * The tests run against exactly the schema the Worker applies.
 */
export function readAuthSchema(): string {
  const migrationsDir = new URL("../migrations/", import.meta.url).pathname;

  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(`${migrationsDir}${name}`, "utf8"))
    .join("\n");
}
