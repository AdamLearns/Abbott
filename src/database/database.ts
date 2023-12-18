import dotenvFlow from "dotenv-flow"
import { Kysely, PostgresDialect } from "kysely"
import pg from "pg"

import type { DB } from "./types/db.d.ts"

const { Pool } = pg

// The database initialization happens outside of a function, so we need to make
// sure that we can pull environment variables here.
dotenvFlow.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_CONNECTION_STRING,
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
