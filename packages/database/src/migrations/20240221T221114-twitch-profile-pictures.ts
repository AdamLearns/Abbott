import { Kysely, sql } from "kysely"

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("twitch_profile_pictures")

    .addColumn("twitch_id", "text", (col) =>
      col
        .notNull()
        .references("user_correlation.twitch_id")
        .onDelete("cascade")
        .primaryKey(),
    )
    .addColumn("profile_picture_url", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("updated_at", "timestamp", (col) =>
      col.defaultTo(sql`now()`).notNull(),
    )
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("twitch_profile_pictures").execute()
}
