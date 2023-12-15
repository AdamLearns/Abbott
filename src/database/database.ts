import { Kysely, PostgresDialect } from "kysely"
import pg from "pg"

import type { DB } from "./types/db.d.ts"
const { Pool } = pg

const dialect = new PostgresDialect({
  pool: new Pool({
    database: "foo",
    host: "localhost",
    user: "postgres",
    password: "bar",
    port: 5432,
    max: 10,
  }),
})

export const db = new Kysely<DB>({
  dialect,
})
