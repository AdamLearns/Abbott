# Abbott
A bot specifically for the Adam Learns show (Twitch, Discord, etc.).

## Expectations

This code is publicly viewable, but it isn't exactly "open-source":

- The code is not licensed for use by anyone other than myself.
- I don't plan on making the bot be generally available or usable (e.g. I probably won't add features that people ask about).
- I probably won't do anything explicit to maintain this repo unless it's something I need for myself.

## Migrations

- Creating: `pnpm run kysely-migration-cli create <migration_name>`
- Migrating: `pnpm run kysely-migration-cli latest`
- Regenerating types (make sure to replace the variables): `DATABASE_URL=postgres://postgres:bar@localhost/foo pnpm run kysely-codegen`
- Copy the regenerated types to the right location: `cp ./node_modules/kysely-codegen/dist/db.d.ts ./src/database/types/db.d.ts`
