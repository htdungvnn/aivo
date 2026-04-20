import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  driver: "d1",
  dbCredentials: {
    databaseName: "aivo-db",
    localStorageKey: "drizzle:telemetry",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  },
} satisfies Config;
