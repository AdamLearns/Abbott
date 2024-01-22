import { type Kysely, sql } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user_correlation")
    .addUniqueConstraint("user_correlation_twitch_id_unique", ["twitch_id"])
    .execute()
  await db.schema
    .alterTable("user_correlation")
    .addUniqueConstraint("user_correlation_discord_id_unique", ["discord_id"])
    .execute()

  await db.schema
    .createTable("config")
    .addColumn("key", "text", (col) => col.notNull().primaryKey())
    .addColumn("value", "text")
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("twitch_oauth_tokens")
    .addColumn("twitch_id", "text", (col) =>
      col
        .notNull()
        .references("user_correlation.twitch_id")
        .onDelete("cascade")

        // This only allows one token per user, which greatly simplifies things.
        .primaryKey(),
    )
    .addColumn("access_token", "text", (col) => col.notNull())
    .addColumn("refresh_token", "text", (col) => col.notNull())
    .addColumn("expires_in", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()

  await db.schema
    .createTable("twitch_oauth_token_scopes")

    .addColumn("twitch_id", "text", (col) =>
      col
        .notNull()
        .references("user_correlation.twitch_id")
        .onDelete("cascade"),
    )
    .addColumn("scope", "text", (col) => col.notNull())
    .addPrimaryKeyConstraint("twitch_oauth_token_scopes_primary_key", [
      "twitch_id",
      "scope",
    ])
    .execute()

  await db.schema
    .createTable("twitch_names")

    .addColumn("twitch_id", "text", (col) =>
      col
        .notNull()
        .references("user_correlation.twitch_id")
        .onDelete("cascade")
        .primaryKey(),
    )
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("twitch_oauth_token_scopes").execute()
  await db.schema.dropTable("twitch_oauth_tokens").execute()
  await db.schema.dropTable("twitch_names").execute()
  await db.schema.dropTable("config").execute()

  const uniqueConstraints = [
    "user_correlation_twitch_id_unique",
    "user_correlation_discord_id_unique",
  ]
  for (const constraint of uniqueConstraints) {
    await db.schema
      .alterTable("user_correlation")
      .dropConstraint(constraint)
      .execute()
  }
}
