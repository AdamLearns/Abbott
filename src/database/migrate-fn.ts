import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import dotenvFlow from "dotenv-flow"
import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from "kysely"
import { run } from "kysely-migration-cli"
import pg from "pg"
const { Pool } = pg

function getMigrationFolder() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  return path.join(__dirname, "migrations")
}

export function makeMigrator<T>(db: Kysely<T>) {
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      migrationFolder: getMigrationFolder(),
      path,
    }),
  })
}

export function migrate() {
  dotenvFlow.config()

  // The very nature of migrations is that we are about to change the
  // types of the database, so we intentionally use `unknown` here.
  const db = new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_CONNECTION_STRING,
        max: 10,
      }),
    }),
  })
  const migrator = makeMigrator(db)

  // @ts-expect-error: kysely-migration-cli imports Kysely from the "cjs" path,
  // but my .tsconfig is set to "nodenext", so I'll try loading from the "esm"
  // path. I think the "proper" way to fix this would be to get them to load
  // from the same path, but I don't know the best way of doing that.
  run(db, migrator, getMigrationFolder())

  console.log(
    "Don't forget to regenerate types with something like this: DATABASE_URL=postgres://postgres:bar@localhost/foo pnpm run kysely-codegen",
  )
}
