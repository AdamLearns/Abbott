import type { DatabaseTextCommand } from "./DatabaseTextCommand"

export interface BotStorageLayer {
  addAlias(id: string, alias: string, targetCommandName: string): Promise<void>
  addCommand(params: {
    id: string
    isPrivileged: boolean
    canBeDeleted: boolean
    name: string
    textResponse: string | undefined
  }): Promise<void>
  findCommandByName(name: string): Promise<string | undefined>
  deleteAliasOfCommand(id: string, alias: string): Promise<void>
  editCommand(id: string, response: string): Promise<void>
  deleteCommand(id: string): Promise<void>
  loadTextCommands(): Promise<DatabaseTextCommand[]>
}
