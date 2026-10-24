-- Onboarding status, owned by the Onboarding/Profile feature.
--
-- The auth feature only reads this table to decide where to route a user
-- after authentication; it never writes fitness data here.

create table if not exists "user_onboarding" (
  "user_id" text not null primary key references "user" ("id") on delete cascade,
  "onboarding_completed" integer not null default 0,
  "updated_at" date not null
);
