import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    databaseName: "aivo-db",
    localStorageKey: "drizzle:telemetry",
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  },
} satisfies Config;
