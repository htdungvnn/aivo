-- The rate limit counter, owned by the Auth feature.
--
-- A Worker isolate is short-lived, so an in-memory counter never survives
-- long enough to reach the limit. The counter is kept in D1 instead, which
-- means the limit is enforced for every request.
--
-- The table is also part of the generated `0001_auth.sql`, so this migration
-- is written to be safe to apply on a database that already has it.

create table if not exists "rateLimit" (
  "id" text not null primary key,
  "key" text not null unique,
  "count" integer not null,
  "lastRequest" bigint not null
);
