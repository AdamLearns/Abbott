import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { CommandInteraction, SlashCommandBuilder } from "discord.js"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface DiscordCommand {
  data: SlashCommandBuilder
  execute: (interaction: CommandInteraction) => Promise<void>
}

function isCommand(command: DiscordCommand): command is DiscordCommand {
  return "data" in command && "execute" in command
}

export async function readAllCommands(): Promise<Map<string, DiscordCommand>> {
  const commands = new Map<string, DiscordCommand>()

  const foldersPath = path.join(__dirname, "commands")
  const commandFolders = fs
    .readdirSync(foldersPath)
    .filter((entry) =>
      fs.lstatSync(path.join(foldersPath, entry)).isDirectory(),
    )

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder)
    const commandFiles = fs
      .readdirSync(commandsPath)
      // (in the Docker image, .ts files become .js files, so find them both)
      .filter(
        (file) =>
          (file.endsWith(".ts") && !file.endsWith(".d.ts")) ||
          file.endsWith(".js"),
      )
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file)
      const command = (await import(filePath)) as DiscordCommand

      if (!isCommand(command)) {
        throw new Error(`The file at ${filePath} is not a command`)
      }
      commands.set(command.data.name, command)
    }
  }

  return commands
}
