// This code originally came from here:
// https://github.com/acro5piano/kysely-migration-cli/blob/f92ddee63285891d676703a8e9cfdf4af11fc741/src/run.ts
//
// I wanted this to be an ES module rather than a CJS module, and I also had
// some minor changes to make.
import fs from "node:fs"

import { program } from "@commander-js/extra-typings"
import {
  Kysely,
  type MigrationResultSet,
  Migrator,
  NO_MIGRATIONS,
} from "kysely"

function showResults({ error, results }: MigrationResultSet) {
  if (results) {
    for (const it of results)
      console.log(`> ${it.status}: ${it.migrationName} (${it.direction})`)

    if (results.length === 0) {
      console.log("> No pending migrations to execute")
    }
  }
  if (error) {
    console.error(error)
    console.error("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨 Exiting.")
    process.exit(1)
  }
}

export async function run(
  db: Kysely<unknown>,
  migrator: Migrator,
  path: string = "./migrations",
) {
  program
    .command("up")
    .description("Run a pending migration if any")
    .action(async () => {
      console.log("Running single migration")
      const results = await migrator.migrateUp()
      showResults(results)
    })

  program
    .command("down")
    .description("Revert the latest migration with a down file")
    .action(async () => {
      console.log("Reverting migrations")
      const results = await migrator.migrateDown()
      showResults(results)
    })

  program
    .command("redo")
    .description("Down and Up")
    .action(async () => {
      console.log("Reverting migrations")
      let results = await migrator.migrateDown()
      showResults(results)
      console.log("Running single migration")
      results = await migrator.migrateUp()
      showResults(results)
    })

  program
    .command("latest")
    .description("Run all pending migrations")
    .action(async () => {
      console.log("Running migrations")
      const results = await migrator.migrateToLatest()
      showResults(results)
    })

  program
    .command("down-to")
    .argument("<migration-name>")
    .description(
      'Migrates down to the specified migration name. Specify "NO_MIGRATIONS" to migrate all the way down.',
    )
    .action(async (name) => {
      let results: MigrationResultSet

      if (name === "NO_MIGRATIONS") {
        console.log(`Migrating all the way down`)
        results = await migrator.migrateTo(NO_MIGRATIONS)
      } else {
        console.log(`Migrating down to ${name}`)
        results = await migrator.migrateTo(name)
      }
      showResults(results)
    })

  program
    .command("create")
    .argument("<input-file>")
    .description(
      "Create a new migration with the given description, and the current time as the version",
    )
    .action((name) => {
      const dateStr = new Date()
        .toISOString()
        .replaceAll(/[:-]/g, "")
        .split(".")[0]
      const fileName = `${path}/${dateStr}-${name}.ts`
      const mkdir = () => {
        fs.mkdirSync(path)
      }
      try {
        if (!fs.lstatSync(path).isDirectory()) {
          mkdir()
        }
      } catch {
        fs.mkdirSync(path)
      }
      fs.writeFileSync(fileName, TEMPLATE, "utf8")
      console.log("Created Migration:", fileName)
    })

  await program.parseAsync().then(() => db.destroy())
}

const TEMPLATE = `import { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
}

export async function down(db: Kysely<unknown>): Promise<void> {
}
`
