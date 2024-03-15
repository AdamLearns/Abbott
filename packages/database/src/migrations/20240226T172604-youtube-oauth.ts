import { Kysely, sql } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("user_correlation")
    .addColumn("youtube_id", "text", (col) => col.unique())
    .execute()

  await db.schema
    .createTable("youtube_names")

    .addColumn("youtube_id", "text", (col) =>
      col
        .notNull()
        .references("user_correlation.youtube_id")
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

  await db.schema
    .createTable("youtube_oauth_tokens")
    .addColumn("youtube_id", "text", (col) =>
      col
        .notNull()
        .references("user_correlation.youtube_id")
        .onDelete("cascade")

        // This only allows one token per user, which greatly simplifies things.
        .primaryKey(),
    )
    .addColumn("access_token", "text", (col) => col.notNull())
    .addColumn("refresh_token", "text", (col) => col.notNull())
    .addColumn("expires_at", "bigint", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("youtube_names").execute()
  await db.schema.dropTable("youtube_oauth_tokens").execute()
  await db.schema
    .alterTable("user_correlation")
    .dropColumn("youtube_id")
    .execute()
}
