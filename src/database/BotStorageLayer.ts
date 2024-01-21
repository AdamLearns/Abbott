import type { AccessToken } from "@twurple/auth"

import type { DatabaseTextCommand } from "./DatabaseTextCommand.js"
import type {
  GetQuote,
  NewCommand,
  NewCommandName,
} from "./types/kysely-wrappers.js"

export interface AccessTokenWithName {
  token: AccessToken
  name: string
}

export interface BotStorageLayer {
  addAlias(
    newCommandName: NewCommandName,
    targetCommandName: string,
  ): Promise<void>
  addCommand(params: {
    newCommand: NewCommand
    name: string
    textResponse: string | undefined
  }): Promise<void>
  findCommandByName(name: string): Promise<string | undefined>
  deleteAliasOfCommand(id: string, alias: string): Promise<void>
  editCommand(id: string, response: string): Promise<void>
  deleteCommand(id: string): Promise<void>
  loadTextCommands(): Promise<DatabaseTextCommand[]>
  fuzzyFindCommands(searchString: string): Promise<string[]>
  addQuote(author: string, quote: string): Promise<number>
  getQuote(id: number): Promise<GetQuote | undefined>
  getRandomQuote(): Promise<GetQuote | undefined>
  deleteQuote(id: number): Promise<GetQuote | undefined>
  getNumQuotes(): Promise<number>
  getTextCommandResponse(commandName: string): Promise<string | undefined>
  saveTwitchToken(
    accessToken: AccessToken,
    userId: string,
    userName: string,
    isPrimaryBotUser: boolean,
  ): Promise<void>
  getPrimaryBotTwitchId(): Promise<string | null>
  getTwitchToken(twitchId: string): Promise<AccessTokenWithName>
  refreshTwitchToken(twitchId: string, newTokenData: AccessToken): Promise<void>
}
