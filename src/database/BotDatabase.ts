import { sql } from "kysely"
import sample from "lodash/sample"

import { db } from "../database/database"

import type { BotStorageLayer } from "./BotStorageLayer"
import type { DatabaseTextCommand } from "./DatabaseTextCommand"
import type {
  GetQuote,
  NewCommand,
  NewCommandName,
} from "./types/kysely-wrappers"

export class BotDatabase implements BotStorageLayer {
  async deleteCommand(id: string) {
    await db.deleteFrom("commands").where("id", "=", id).execute()
  }

  async editCommand(id: string, response: string) {
    await db
      .updateTable("text_command_responses")
      .set({
        response,
        updated_at: sql`now()`,
      })
      .where("id", "=", id)
      .execute()
  }

  async deleteAliasOfCommand(id: string, alias: string) {
    await db
      .deleteFrom("command_names")
      .where("id", "=", id)
      .where("name", "=", alias)
      .execute()
  }

  async findCommandByName(name: string): Promise<string | undefined> {
    const response = await db
      .selectFrom("commands")
      .innerJoin("command_names", "commands.id", "command_names.id")
      .where("command_names.name", "=", name)
      .select(["commands.id"])
      .executeTakeFirst()

    return response?.id
  }

  async addCommand({
    newCommand,
    name,
    textResponse,
  }: {
    newCommand: NewCommand
    name: string
    textResponse?: string | undefined
  }) {
    await db.transaction().execute(async (trx) => {
      await trx.insertInto("commands").values(newCommand).execute()

      await trx
        .insertInto("command_names")
        .values({
          id: newCommand.id,
          name,
        })
        .execute()

      if (textResponse) {
        await trx
          .insertInto("text_command_responses")
          .values({
            id: newCommand.id,
            response: textResponse,
          })
          .execute()
      }
    })
  }

  async addAlias(newCommandName: NewCommandName, targetCommandName: string) {
    await db.transaction().execute(async (trx) => {
      // If the alias already exists and points to the correct command in the
      // database, then don't do anything. This is so that we don't get errors
      // trying to add the built-in aliases every time the bot starts up.
      const response = await trx
        .selectFrom("commands")
        .innerJoin("command_names", "commands.id", "command_names.id")
        .where("commands.id", "=", newCommandName.id)
        .where("command_names.name", "in", [
          newCommandName.name,
          targetCommandName,
        ])
        .select(["command_names.name"])
        .execute()

      if (response.length !== 2) {
        await trx.insertInto("command_names").values(newCommandName).execute()
      }
    })
  }

  async loadTextCommands(): Promise<DatabaseTextCommand[]> {
    {
      return db
        .selectFrom("commands")
        .innerJoin("command_names", "commands.id", "command_names.id")
        .innerJoin(
          "text_command_responses",
          "commands.id",
          "text_command_responses.id",
        )
        .select([
          "commands.id",
          "command_names.name",
          "commands.is_privileged",
          "commands.can_be_deleted",
          "text_command_responses.response",
        ])
        .execute()
    }
  }

  async fuzzyFindCommands(searchString: string): Promise<string[]> {
    const response = await db
      .selectFrom("commands")
      .innerJoin("command_names", "commands.id", "command_names.id")
      .innerJoin(
        "text_command_responses",
        "commands.id",
        "text_command_responses.id",
      )
      .where("text_command_responses.response", "ilike", `%${searchString}%`)
      .select(["command_names.name"])
      .execute()

    return response.map((row) => row.name)
  }

  async addQuote(author: string, quote: string): Promise<number> {
    const response = await db
      .insertInto("quotes")
      .values({
        author,
        quote,
      })
      .returning("id")
      .executeTakeFirstOrThrow()

    return response.id
  }

  async getQuote(id: number): Promise<GetQuote | undefined> {
    return db
      .selectFrom("quotes")
      .where("id", "=", id)
      .select(["id", "author", "quote", "quoted_at"])
      .executeTakeFirst()
  }

  async getRandomQuote(): Promise<GetQuote | undefined> {
    const response = await db
      .selectFrom("quotes")
      .select(["id", "author", "quote", "quoted_at"])
      .execute()

    return sample(response)
  }

  async deleteQuote(id: number): Promise<GetQuote | undefined> {
    return db
      .deleteFrom("quotes")
      .where("id", "=", id)
      .returning(["id", "author", "quote", "quoted_at"])
      .executeTakeFirst()
  }

  async getNumQuotes(): Promise<number> {
    const response = await db
      .selectFrom("quotes")
      .select(db.fn.countAll().as("count"))
      .executeTakeFirstOrThrow()

    return Number.parseInt(response.count as string, 10)
  }
}
