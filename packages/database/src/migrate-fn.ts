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
import pg from "pg"

import { run } from "./kysely-migration-cli.js"
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

// The very nature of migrations is that we are about to change the types of the
// database, so we intentionally use `unknown` here.
export function makeDbForMigration(): Kysely<unknown> {
  return new Kysely<unknown>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_CONNECTION_STRING,
        max: 10,
      }),
    }),
  })
}

export async function migrate() {
  dotenvFlow.config()

  const db = makeDbForMigration()
  const migrator = makeMigrator(db)

  await run(db, migrator, getMigrationFolder())

  console.log(
    "Don't forget to regenerate types with something like this: DATABASE_URL=postgres://postgres:bar@localhost/foo pnpm run kysely-codegen",
  )
}
