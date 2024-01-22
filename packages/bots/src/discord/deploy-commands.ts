import {
  REST,
  Routes,
  type RESTPutAPIApplicationCommandsResult,
} from "discord.js"
import dotenvFlow from "dotenv-flow"

import { readAllCommands } from "./commands.js"
dotenvFlow.config()

const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.env.DISCORD_GUILD_ID
const discordToken = process.env.DISCORD_TOKEN

async function main() {
  if (
    discordToken === undefined ||
    clientId === undefined ||
    guildId === undefined
  ) {
    throw new Error("Missing environment variables.")
  }

  try {
    const commands = await readAllCommands()
    console.log(`Started refreshing ${commands.size} application (/) commands.`)

    const restCommands = [...commands.values()].map((command) =>
      command.data.toJSON(),
    )

    const rest = new REST().setToken(discordToken)
    const data = (await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: restCommands },
    )) as RESTPutAPIApplicationCommandsResult

    console.log(JSON.stringify(data))

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`,
    )
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
}

await main()
