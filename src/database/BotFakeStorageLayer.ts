/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-empty-function */
import type { BotStorageLayer } from "./BotStorageLayer"
import type { DatabaseTextCommand } from "./DatabaseTextCommand"

export class BotFakeStorageLayer implements BotStorageLayer {
  async addAlias() {}
  async addCommand() {}
  async findCommandByName(): Promise<string | undefined> {
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
}
