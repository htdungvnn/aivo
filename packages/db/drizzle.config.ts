import type { Config } from "drizzle-kit";

export default {
  schema: "./src/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CF_ACCOUNT_ID,
    databaseName: "aivo-db",
    token: process.env.CF_D1_TOKEN,
  },
  verbose: true,
  strict: true,
} satisfies Config;
