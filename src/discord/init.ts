import { Client, Events, GatewayIntentBits, roleMention } from "discord.js"

import { emitter } from "../events/emitter.js"

import { readAllCommands, type Command } from "./commands.js"

type ClientWithCommands = Client & { Commands: Map<string, Command> }

export async function init() {
  if (
    process.env.DISCORD_TOKEN === undefined ||
    process.env.DISCORD_STREAM_ANNOUNCEMENTS_CHANNEL_ID === undefined ||
    process.env.DISCORD_STREAM_ANNOUNCEMENTS_ROLE_ID === undefined
  ) {
    throw new Error("Missing environment variables for Discord.")
  }

  const announcementsChannelId =
    process.env.DISCORD_STREAM_ANNOUNCEMENTS_CHANNEL_ID

  const streamAnnouncementsRoleId =
    process.env.DISCORD_STREAM_ANNOUNCEMENTS_ROLE_ID

  const client = new Client({ intents: [GatewayIntentBits.Guilds] })
  const clientWithCommands = client as ClientWithCommands

  clientWithCommands.Commands = await readAllCommands()

  clientWithCommands.once(Events.GuildCreate, (guild) => {
    console.log(`Joined the ${guild.name} server.`)
  })

  clientWithCommands.once(Events.ClientReady, (readyClient) => {
    const allGuildNames = readyClient.guilds.cache.map((guild) => guild.name)
    const allGuildNamesString = JSON.stringify(allGuildNames)
    const botName = readyClient.user.tag
    const numCommands = clientWithCommands.Commands.size
    console.log(
      `Logged in on Discord as ${botName} to servers: ${allGuildNamesString}. Read in ${numCommands} command(s).`,
    )
  })

  emitter.onStreamOnline(async (title) => {
    console.log("Stream went online:", title)
    const channelId = announcementsChannelId
    const channel = client.channels.cache.get(channelId)
    if (channel === undefined) {
      console.error(`Couldn't find the ${channelId} channel.`)
      return
    }
    if (channel.isTextBased()) {
      const tag = roleMention(streamAnnouncementsRoleId)
      let message = `${tag} Adam just went live! <https://twitch.tv/AdamLearnsLive>`
      if (title !== null) {
        message += ` Title: ${title}`
      }
      await channel.send(message)
    }
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
