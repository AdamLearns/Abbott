import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import type { MigrationResult } from "kysely"

import { makeDbForMigration, makeMigrator } from "../database/migrate-fn.js"

function backupDatabase(): string {
  if (process.env.DATABASE_BACKUP_LOCATION === undefined) {
    throw new Error("DATABASE_BACKUP_LOCATION is not defined")
  }

  try {
    execSync("pg_dump --version")
  } catch {
    throw new Error(
      "pg_dump binary not found. Please make sure it is installed in order to take database backups.",
    )
  }

  const date = new Date().toISOString().replaceAll(":", "-")
  const filename = `abbott_backup_${date}.sql`
  const backupLocation = path.join(
    process.env.DATABASE_BACKUP_LOCATION,
    filename,
  )

  console.log("Backing up database to", backupLocation)
  execSync(
    `pg_dump -d ${process.env.DATABASE_CONNECTION_STRING} > ${backupLocation}`,
  )
  console.log("Successfully backed up database")

  return backupLocation
}

export async function migrateIfNeeded() {
  if (process.env.MIGRATE_DATABASE_ON_STARTUP !== "true") {
    return
  }

  // Without checking the kysely_migration table in the database and comparing
  // it against all of the migration files that we have, we can't tell ahead of
  // time whether we have any migrations to run, so we instead run the
  // migrations, and if we ran zero, we delete this backup.
  const backupLocation = backupDatabase()

  const db = makeDbForMigration()
  const migrator = makeMigrator(db)
  console.log("Migrating database to latest")
  const { results, error } = await migrator.migrateToLatest()
  handlePotentialMigrationError(error, results, backupLocation)
}

function handlePotentialMigrationError(
  error: unknown,
  results: MigrationResult[] | undefined,
  backupLocation: string,
) {
  if (error !== undefined) {
    if (results === undefined) {
      throw new Error(
        "Couldn't migrate the database. No results returned to be able to give more information.",
      )
    }
    console.error("Failed to run the following migration files:")
    for (const result of results) {
      if (result.status.toLowerCase() === "error") {
        console.error(`\t${result.migrationName}`)
      }
    }
    throw new Error("Couldn't migrate the database. Try running manually.")
  }

  const numMigrationsRun = results?.length ?? 0
  console.log(`Migration complete. Ran ${numMigrationsRun} migration(s)`)

  if (numMigrationsRun === 0) {
    console.log("Since no migrations were run, deleting the backup.")
    fs.unlinkSync(backupLocation)
  }
}
