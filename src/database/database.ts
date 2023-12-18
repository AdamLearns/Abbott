import { Kysely, PostgresDialect } from "kysely"
import pg from "pg"

import type { DB } from "./types/db.d.ts"
const { Pool } = pg

const pool = new Pool({
  database: "foo",
  host: "localhost",
  user: "postgres",
  password: "bar",
  port: 5432,
  max: 10,
})

pool.on("error", (err) => {
  // Note: the pool automatically reconnects, so we just need to make sure that
  // we don't crash anything here.
  console.error("Kysely error:", err)
})

const dialect = new PostgresDialect({
  pool,
})

export const db = new Kysely<DB>({
  dialect,
})
