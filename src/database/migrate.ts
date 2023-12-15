import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  Kysely,
  Migrator,
  PostgresDialect,
  FileMigrationProvider,
} from "kysely"
import { run } from "kysely-migration-cli"
import pg from "pg"
const { Pool } = pg

// The very nature of migrations is that we are about to change the
// types of the database, so we intentionally use `unknown` here.
const db = new Kysely<unknown>({
  dialect: new PostgresDialect({
    pool: new Pool({
      database: "foo",
      host: "localhost",
      user: "postgres",
      password: "bar",
      port: 5432,
      max: 10,
    }),
  }),
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrationFolder = path.join(__dirname, "migrations")

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    migrationFolder,
    path,
  }),
})

run(db, migrator, migrationFolder)

console.log(
  "Don't forget to regenerate types with something like this: DATABASE_URL=postgres://postgres:bar@localhost/foo pnpm run kysely-codegen",
)
