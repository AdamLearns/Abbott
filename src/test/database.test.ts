/* eslint-disable @typescript-eslint/no-empty-function */
import dotenvFlow from "dotenv-flow"
import { Kysely, type Migrator, NO_MIGRATIONS, PostgresDialect } from "kysely"
import pg from "pg"
import { uuidv7 } from "uuidv7"
import { beforeAll, beforeEach, describe, expect, test } from "vitest"

import { BotDatabase } from "../database/BotDatabase.js"
import { makeMigrator } from "../database/migrate-fn.js"
import type { DB } from "../database/types/db.d.ts"

dotenvFlow.config()

let botDatabase: BotDatabase
let db: Kysely<DB>
let migrator: Migrator

beforeAll(async () => {
  const { Pool } = pg

  const pool = new Pool({
    connectionString: process.env.DATABASE_CONNECTION_STRING,
    max: 10,
  })

  const dialect = new PostgresDialect({
    pool,
  })

  db = new Kysely<DB>({
    dialect,
  })

  migrator = makeMigrator(db)
  await migrator.migrateToLatest()
})

beforeEach(async () => {
  botDatabase = new BotDatabase()
  // This is essentially just a way to drop the database and recreate it.
  // Technically, it's also helping us test that our "down" migrations work
  // properly. But also, I just don't feel like figuring out how to drop and
  // recreate the database here. 👀
  await migrator.migrateTo(NO_MIGRATIONS)
  await migrator.migrateToLatest()
})

describe("Database tests", () => {
  test("can delete a command", async () => {
    const id = uuidv7()
    await db
      .insertInto("commands")
      .values({
        id,
      })
      .execute()

    await botDatabase.deleteCommand(id)

    const response = await db.selectFrom("commands").execute()

    expect(response).toHaveLength(0)
  })

  test("can edit a command", async () => {
    const id = uuidv7()
    const origResponse = "bar"
    const newResponse = "newbar"
    await botDatabase.addCommand({
      newCommand: { id },
      name: "foo",
      textResponse: origResponse,
    })

    const response = await db
      .selectFrom("text_command_responses")
      .where("id", "=", id)
      .select(["updated_at"])
      .executeTakeFirst()

    expect(response).toBeDefined()
    const origUpdatedAt = response?.updated_at as Date
    await botDatabase.editCommand(id, newResponse)

    const responseAndUpdatedAt = await db
      .selectFrom("text_command_responses")
      .where("id", "=", id)
      .select(["response", "updated_at"])
      .executeTakeFirst()

    expect(responseAndUpdatedAt).toBeDefined()
    expect(responseAndUpdatedAt?.response).toBe(newResponse)
    expect(responseAndUpdatedAt?.updated_at.getTime()).toBeGreaterThan(
      origUpdatedAt.getTime(),
    )
  })

  test("can delete alias of command", async () => {
    const id = uuidv7()
    const name1 = "foo"
    const name2 = "foo2"
    await botDatabase.addCommand({
      newCommand: { id },
      name: name1,
    })

    let foundId = await botDatabase.findCommandByName(name1)
    expect(foundId).toBeDefined()
    foundId = await botDatabase.findCommandByName(name2)
    expect(foundId).toBeUndefined()

    await botDatabase.addAlias({ id, name: name2 }, name1)

    foundId = await botDatabase.findCommandByName(name2)
    expect(foundId).toBeDefined()

    await botDatabase.deleteAliasOfCommand(id, name2)
    foundId = await botDatabase.findCommandByName(name1)
    expect(foundId).toBeDefined()
    foundId = await botDatabase.findCommandByName(name2)
    expect(foundId).toBeUndefined()
  })

  test("can find a command by name", async () => {
    const id = uuidv7()
    const name = "foo"
    await botDatabase.addCommand({
      newCommand: { id },
      name,
    })

    let response = await botDatabase.findCommandByName(name)
    expect(response).toBe(id)

    const nonexistentName = `${name}madeup`
    response = await botDatabase.findCommandByName(nonexistentName)
    expect(response).toBeUndefined()
  })

  test("can add a command", async () => {
    let response = await db.selectFrom("commands").execute()
    expect(response).toHaveLength(0)
    response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(0)
    const id = uuidv7()
    const name = "foo"
    await botDatabase.addCommand({
      newCommand: { id },
      name,
    })

    response = await db.selectFrom("commands").execute()
    expect(response).toHaveLength(1)
    response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(1)
  })

  test("can add an alias", async () => {
    let response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(0)

    const id = uuidv7()
    const name1 = "foo"
    const name2 = "foo2"
    await botDatabase.addCommand({
      newCommand: { id },
      name: name1,
    })

    response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(1)

    await botDatabase.addAlias({ id, name: name2 }, name1)

    response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(2)

    const foundCommand = await botDatabase.findCommandByName(name2)
    expect(foundCommand).toBe(id)
  })

  test("when adding an alias that already exists, do nothing", async () => {
    const id = uuidv7()
    const name1 = "foo"
    const name2 = "foo2"
    const name3 = "foo3"
    await botDatabase.addCommand({
      newCommand: { id },
      name: name1,
    })

    await botDatabase.addAlias({ id, name: name2 }, name1)

    let response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(2)

    // Making the same call we already did should have no effect
    await botDatabase.addAlias({ id, name: name2 }, name1)
    response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(2)

    // Adding a NEW alias should have an effect
    await botDatabase.addAlias({ id, name: name3 }, name1)
    response = await db.selectFrom("command_names").execute()
    expect(response).toHaveLength(3)
  })

  test("should be able to load all text commands from the database", async () => {
    let response = await botDatabase.loadTextCommands()
    expect(response).toHaveLength(0)

    const names = ["foo", "bar", "baz"]
    let count = 0
    for (const name of names) {
      await botDatabase.addCommand({
        newCommand: { id: uuidv7() },
        name,
        textResponse: "response",
      })

      count++
      response = await botDatabase.loadTextCommands()
      expect(response).toHaveLength(count)

      expect(response.map((command) => command.name)).toEqual(
        names.slice(0, count),
      )
    }
  })

  test("can add a quote", async () => {
    const response = await db.selectFrom("quotes").select(["id"]).execute()
    const numQuotes = response.length

    await botDatabase.addQuote("Author", "Hello world")

    const quotesCount = await db
      .selectFrom("quotes")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirstOrThrow()

    const newNumQuotes = Number.parseInt(quotesCount.count as string, 10)
    expect(numQuotes + 1).toBe(newNumQuotes)
  })

  test("can delete a quote", async () => {
    const uniqueAuthor = uuidv7().toString()
    await botDatabase.addQuote(uniqueAuthor, "Hello world")

    const { id } = await db
      .selectFrom("quotes")
      .select("id")
      .where("author", "=", uniqueAuthor)
      .executeTakeFirstOrThrow()

    await botDatabase.deleteQuote(id)

    const response = await botDatabase.getQuote(id)
    expect(response).toBeUndefined()
  })

  test("can get a specific quote", async () => {
    // The reason this will actually work is because the migration sets quotes
    // up for us
    const id = 1
    const response = await botDatabase.getQuote(id)
    expect(response?.id).toBe(id)
  })

  test("can get a random quote", async () => {
    // The reason this will actually work is because the migration sets quotes
    // up for us
    const response = await botDatabase.getRandomQuote()
    expect(response).toBeDefined()
  })
})
