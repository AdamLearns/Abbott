import {
  Client,
  Events,
  GatewayIntentBits,
  roleMention,
  TextChannel,
  type Interaction,
} from "discord.js"

import { emitter } from "../events/emitter.js"

import { readAllCommands, type DiscordCommand } from "./commands.js"

type ClientWithCommands = Client & { Commands: Map<string, DiscordCommand> }

function ensureEnvVars() {
  if (
    process.env.DISCORD_TOKEN === undefined ||
    process.env.DISCORD_STREAM_ANNOUNCEMENTS_CHANNEL_ID === undefined ||
    process.env.DISCORD_STREAM_ANNOUNCEMENTS_ROLE_ID === undefined
  ) {
    throw new Error("Missing environment variables for Discord.")
  }
}

export async function init() {
  ensureEnvVars()

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    enforceNonce: true,
  })
  const clientWithCommands = client as ClientWithCommands

  clientWithCommands.Commands = await readAllCommands()
  clientWithCommands.once(Events.ClientReady, onClientReady(clientWithCommands))

  const announcementsChannelId = process.env
    .DISCORD_STREAM_ANNOUNCEMENTS_CHANNEL_ID as string
  const streamAnnouncementsRoleId = process.env
    .DISCORD_STREAM_ANNOUNCEMENTS_ROLE_ID as string
  emitter.onTwitchStreamLive(
    onStreamOnline(announcementsChannelId, client, streamAnnouncementsRoleId),
  )

  clientWithCommands.on(
    Events.InteractionCreate,
    onInteraction(clientWithCommands),
  )

  await clientWithCommands.login(process.env.DISCORD_TOKEN)
}

function onInteraction(clientWithCommands: ClientWithCommands) {
  return async (interaction: Interaction) => {
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
  }
}

function onStreamOnline(
  announcementsChannelId: string,
  client: Client,
  streamAnnouncementsRoleId: string,
) {
  return async (title: string | null) => {
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
        message += `\n\nTitle: ${title}`
      }
      await (channel as TextChannel).send(message)
    }
  }
}

function onClientReady(clientWithCommands: ClientWithCommands) {
  return (readyClient: Client<true>) => {
    const allGuildNames = readyClient.guilds.cache.map((guild) => guild.name)
    const allGuildNamesString = JSON.stringify(allGuildNames)
    const botName = readyClient.user.tag
    const numCommands = clientWithCommands.Commands.size
    console.log(
      `Logged in on Discord as ${botName} to servers: ${allGuildNamesString}. Read in ${numCommands} command(s).`,
    )
  }
}
