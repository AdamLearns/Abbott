import type { DatabaseTextCommand } from "./DatabaseTextCommand"
import type { NewCommand, NewCommandName } from "./types/kysely-wrappers"

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
}
