import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { CommandInteraction, SlashCommandBuilder } from "discord.js"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface Command {
  data: SlashCommandBuilder
  execute: (interaction: CommandInteraction) => Promise<void>
}

function isCommand(command: Command): command is Command {
  return "data" in command && "execute" in command
}

export async function readAllCommands(): Promise<Map<string, Command>> {
  const commands = new Map<string, Command>()

  const foldersPath = path.join(__dirname, "commands")
  const commandFolders = fs.readdirSync(foldersPath)

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder)
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".ts"))
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file)
      const command = (await import(filePath)) as Command

      if (!isCommand(command)) {
        throw new Error(`The file at ${filePath} is not a command`)
      }
      commands.set(command.data.name, command)
    }
  }

  return commands
}
