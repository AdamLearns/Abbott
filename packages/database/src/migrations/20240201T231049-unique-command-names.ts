import { Kysely } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("command_names")
    .addUniqueConstraint("command_names_name_unique", ["name"])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("command_names")
    .dropConstraint("command_names_name_unique")
    .execute()
}
