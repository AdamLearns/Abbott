import type { AccessToken } from "@twurple/auth"
import { type Transaction, sql } from "kysely"
import sample from "lodash/sample.js"
import { uuidv7 } from "uuidv7"

import { db } from "../database/database.js"

import type { AccessTokenWithName, BotStorageLayer } from "./BotStorageLayer.js"
import type { DatabaseTextCommand } from "./DatabaseTextCommand.js"
import type { DB } from "./types/db.js"
import type {
  GetQuote,
  NewCommand,
  NewCommandName,
} from "./types/kysely-wrappers.js"

const CONFIG_PRIMARY_BOT_USER_ID = "primary_bot_user_id"

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

  async getTextCommandResponse(
    commandName: string,
  ): Promise<string | undefined> {
    const response = await db
      .selectFrom("text_command_responses")
      .innerJoin(
        "command_names",
        "command_names.id",
        "text_command_responses.id",
      )
      .where("command_names.name", "ilike", commandName)
      .select(["text_command_responses.response"])
      .executeTakeFirst()

    return response?.response
  }

  private async insertOrUpdateToken(
    trx: Transaction<DB>,
    twitchId: string,
    accessToken: AccessToken,
  ) {
    await trx
      .insertInto("twitch_oauth_tokens")
      .values({
        twitch_id: twitchId,
        access_token: accessToken.accessToken,
        refresh_token: accessToken.refreshToken as string,
        expires_in: accessToken.expiresIn as number,
      })
      .onConflict((oc) =>
        oc.column("twitch_id").doUpdateSet({
          access_token: accessToken.accessToken,
          refresh_token: accessToken.refreshToken as string,
          expires_in: accessToken.expiresIn as number,
          updated_at: sql`now()`,
        }),
      )
      .execute()
  }

  async saveTwitchToken(
    accessToken: AccessToken,
    twitchId: string,
    twitchName: string,
    isPrimaryBotUser: boolean,
  ): Promise<void> {
    await db.transaction().execute(async (trx) => {
      await this.ensureTwitchUserExists(trx, twitchId, twitchName)

      await this.insertOrUpdateToken(trx, twitchId, accessToken)

      // Delete any scopes for this token and then re-insert them
      await trx
        .deleteFrom("twitch_oauth_token_scopes")
        .where("twitch_id", "=", twitchId)
        .execute()

      for (const scope of accessToken.scope) {
        await trx
          .insertInto("twitch_oauth_token_scopes")
          .values({
            twitch_id: twitchId,
            scope,
          })
          .execute()
      }

      if (isPrimaryBotUser) {
        await trx
          .insertInto("config")
          .values({
            key: CONFIG_PRIMARY_BOT_USER_ID,
            value: twitchId,
          })
          .onConflict((oc) =>
            oc.column("key").doUpdateSet({
              value: twitchId,
              updated_at: sql`now()`,
            }),
          )
          .execute()
      }
    })
  }

  async ensureTwitchUserExists(
    trx: Transaction<DB>,
    twitchId: string,
    twitchName: string,
  ) {
    let uuid: string | undefined

    // Check if the user already exists
    const response = await trx
      .selectFrom("users")
      .innerJoin("user_correlation", "users.id", "user_correlation.id")
      .where("user_correlation.twitch_id", "=", twitchId)
      .select(["users.id"])
      .executeTakeFirst()

    if (response === undefined) {
      uuid = uuidv7()
      await trx
        .insertInto("users")
        .values({
          id: uuid,
        })
        .execute()

      await trx
        .insertInto("user_correlation")
        .values({
          id: uuid,
          twitch_id: twitchId,
        })
        .execute()
    }

    await trx
      .insertInto("twitch_names")
      .values({
        twitch_id: twitchId,
        name: twitchName,
      })
      .onConflict((oc) =>
        oc.column("twitch_id").doUpdateSet({
          name: twitchName,
          updated_at: sql`now()`,
        }),
      )
      .execute()
  }

  async getTwitchToken(): Promise<AccessTokenWithName> {
    const response = await db.transaction().execute(async (trx) => {
      const response = await trx
        .selectFrom("config")
        .where("key", "=", CONFIG_PRIMARY_BOT_USER_ID)
        .select(["value"])
        .executeTakeFirst()

      if (response === undefined) {
        throw new Error(
          "Couldn't find the primary bot user ID in the database.",
        )
      }

      const twitchId = response.value
      if (twitchId === null) {
        throw new Error(
          "Found the primary bot user ID in the database, but it was null.",
        )
      }

      const tokenResponse = await trx
        .selectFrom("twitch_oauth_tokens")
        .innerJoin(
          "twitch_names",
          "twitch_oauth_tokens.twitch_id",
          "twitch_names.twitch_id",
        )
        .where("twitch_oauth_tokens.twitch_id", "=", twitchId)
        .select([
          "twitch_oauth_tokens.access_token",
          "twitch_oauth_tokens.refresh_token",
          "twitch_oauth_tokens.expires_in",
          "twitch_oauth_tokens.updated_at",
          "twitch_names.name",
        ])
        .executeTakeFirst()

      if (tokenResponse === undefined) {
        throw new Error(
          "Found a primary bot ID, but couldn't find any tokens for it in the database.",
        )
      }

      // Fetch the scopes corresponding to that token
      const scopesResponse = await trx
        .selectFrom("twitch_oauth_token_scopes")
        .where("twitch_id", "=", twitchId)
        .select(["scope"])
        .execute()

      const scopes = []
      for (const row of scopesResponse) {
        scopes.push(row.scope)
      }
      const accessToken = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: Number.parseInt(tokenResponse.expires_in),
        scope: scopes,
        // According to the link below, this should be the updated_at time, not
        // created_at. See
        // https://github.com/twurple/twurple/blob/7736fd144b108f09febf5a270a38225ca5b6f339/packages/auth/src/helpers.ts#L78-L91
        obtainmentTimestamp: tokenResponse.updated_at.getTime(),
      }

      return {
        token: accessToken,
        name: tokenResponse.name,
      }
    })

    return response
  }

  async refreshTwitchToken(newTokenData: AccessToken): Promise<void> {
    await db.transaction().execute(async (trx) => {
      const response = await trx
        .selectFrom("config")
        .where("key", "=", CONFIG_PRIMARY_BOT_USER_ID)
        .select(["value"])
        .executeTakeFirst()

      if (response === undefined) {
        throw new Error(
          "Couldn't find the primary bot user ID in the database.",
        )
      }

      const twitchId = response.value
      if (twitchId === null) {
        throw new Error(
          "Found the primary bot user ID in the database, but it was null.",
        )
      }

      await this.insertOrUpdateToken(trx, twitchId, newTokenData)
    })
  }
}
