import { type Kysely, sql } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("user_correlation")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().references("users.id").onDelete("cascade"),
    )
    .addColumn("twitch_id", "text")
    .addColumn("discord_id", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("command_usage")
    // This may not point to an existing command anymore. It captures
    // the command name at the time it was used.
    //
    // This won't contain the prefix (e.g. "!today" on Twitch would show
    // as "today" in this column.)
    .addColumn("command_name", "text", (col) => col.notNull())
    .addColumn("full_message", "text", (col) => col.notNull())

    // If a user was deleted, then it's probably because they intentionally
    // didn't want their data here, so delete their command usages as well.
    .addColumn("user_id", "uuid", (col) =>
      col.notNull().references("users.id").onDelete("cascade"),
    )
    .addColumn("usage_time", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("commands")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .addColumn("is_privileged", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("can_be_deleted", "boolean", (col) =>
      col.defaultTo(false).notNull(),
    )
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("text_command_responses")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().references("commands.id").onDelete("cascade"),
    )
    .addColumn("response", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("command_names")
    .addColumn("id", "uuid", (col) =>
      col.references("commands.id").onDelete("cascade"),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addPrimaryKeyConstraint("pk_command_names", ["id", "name"])
    .execute()
}

export async function down(db: Kysely<unknown>) {
  await db.schema.dropTable("text_command_responses").execute()
  await db.schema.dropTable("command_names").execute()
  await db.schema.dropTable("commands").execute()
  await db.schema.dropTable("user_correlation").execute()
  await db.schema.dropTable("command_usage").execute()
  await db.schema.dropTable("users").execute()
}
