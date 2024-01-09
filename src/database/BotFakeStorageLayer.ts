/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-empty-function */
import type { BotStorageLayer } from "./BotStorageLayer.js"
import type { DatabaseTextCommand } from "./DatabaseTextCommand.js"

export class BotFakeStorageLayer implements BotStorageLayer {
  async addAlias() {}
  async addCommand() {}
  async findCommandByName(): Promise<undefined> {
    return undefined
  }
  async deleteAliasOfCommand() {}
  async editCommand() {}
  async deleteCommand() {}
  async loadTextCommands(): Promise<DatabaseTextCommand[]> {
    return []
  }
  async fuzzyFindCommands(): Promise<string[]> {
    return []
  }
  async addQuote(): Promise<number> {
    return 0
  }
  async getQuote(): Promise<undefined> {
    return undefined
  }
  async getRandomQuote(): Promise<undefined> {
    return undefined
  }
  async deleteQuote(): Promise<undefined> {
    return undefined
  }
  async getNumQuotes() {
    return 0
  }
  async getTextCommandResponse() {
    return undefined
  }
}
