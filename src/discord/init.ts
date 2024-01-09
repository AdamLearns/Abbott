import { Client, Events, GatewayIntentBits } from "discord.js"

import { readAllCommands, type Command } from "./commands.js"

type ClientWithCommands = Client & { Commands: Map<string, Command> }

export async function init() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] })
  const clientWithCommands = client as ClientWithCommands

  clientWithCommands.Commands = await readAllCommands()

  clientWithCommands.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`)
  })

  clientWithCommands.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return

    const command = clientWithCommands.Commands.get(interaction.commandName)

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`)
      return
    }

    try {
      await command.execute(interaction)
    } catch (error) {
      console.error(error)
      await (interaction.replied || interaction.deferred
        ? interaction.followUp({
            content: "There was an error while executing this command!",
            ephemeral: true,
          })
        : interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
          }))
    }
  })

  await clientWithCommands.login(process.env.DISCORD_TOKEN)
}
