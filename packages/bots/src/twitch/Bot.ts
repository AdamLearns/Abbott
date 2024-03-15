import { ApiClient } from "@twurple/api"
import type { AccessToken, RefreshingAuthProvider } from "@twurple/auth"
import {
  ChatClient,
  type ChatUser,
  LogLevel,
  type ChatMessage,
} from "@twurple/chat"
import { EventSubWsListener } from "@twurple/eventsub-ws"
import type { BotStorageLayer } from "abbott-database"
import { BotDatabase } from "abbott-database"

import { Command } from "../commands/Command.js"
import { CommandContext } from "../commands/CommandContext.js"
import { getCommandAndParams } from "../commands/CommandData.js"
import { GenericBot, type GenericMessage } from "../commands/GenericBot.js"
import { InMemoryCommands } from "../commands/InMemoryCommands.js"
import { commandPrefix } from "../constants.js"
import { emitter } from "../events/emitter.js"

// (in milliseconds)
const GLOBAL_COMMAND_COOLDOWN = 4000

type MakeApiClient = (authProvider: RefreshingAuthProvider) => ApiClient
type MakeChatClient = (authProvider: RefreshingAuthProvider) => ChatClient

const logLevel = LogLevel.ERROR

export class Bot extends GenericBot {
  private readonly chat: ChatClient
  private readonly apiClient: ApiClient
  private readonly authProvider: RefreshingAuthProvider
  private readonly twitchChannelName: string
  private readonly eventSubListener: EventSubWsListener
  private name = "unset" // the Twitch user name of the bot
  private twitchId = "unset"

  constructor({
    twitchChannelName,
    authProvider,
    commands,
    storageLayer,
    makeApiClient,
    makeChatClient,
  }: {
    twitchChannelName: string
    authProvider: RefreshingAuthProvider
    commands: InMemoryCommands
    storageLayer?: BotStorageLayer | undefined
    makeApiClient?: MakeApiClient | undefined
    makeChatClient?: MakeChatClient | undefined
  }) {
    super(commands, storageLayer ?? new BotDatabase())
    this.twitchChannelName = twitchChannelName
    this.authProvider = authProvider
    this.apiClient =
      makeApiClient === undefined
        ? new ApiClient({
            authProvider,
            logger: { minLevel: logLevel },
          })
        : makeApiClient(authProvider)

    this.eventSubListener = new EventSubWsListener({
      apiClient: this.apiClient,
      logger: { minLevel: logLevel },

      // The mock Twitch CLI URL (which I couldn't get to work)
      // url: "ws://127.0.0.1:8080/ws",
    })

    this.chat =
      makeChatClient === undefined
        ? new ChatClient({
            logger: { minLevel: logLevel },
            authProvider,

            // This prevents us from having user-level rate limits
            isAlwaysMod: true,
            channels: [twitchChannelName],
          })
        : makeChatClient(authProvider)

    // We need to process msg because it has all of the information and we may need that to determine whether someone typed a command
    this.chat.onMessage(this.onMessage)
    this.chat.connect()
  }

  async setUpEventListeners() {
    const user = await this.apiClient.users.getUserByName(
      this.twitchChannelName,
    )

    if (user === null) {
      throw new Error(
        `Couldn't get user ID for Twitch name "${this.twitchChannelName}"`,
      )
    }

    console.log(
      `User ID of ${this.twitchChannelName}: ${user.id}. Setting up a listener.`,
    )

    this.eventSubListener.start()

    this.eventSubListener.onStreamOnline(user.id, async (event) => {
      const stream = await event.getStream()
      const title = stream?.title ?? null

      emitter.sendTwitchStreamLive(title)
    })

    this.eventSubListener.onUserSocketDisconnect(
      (userId: string, error?: Error) => {
        // This happens every so often without an explicit disconnect being
        // called. It just indicates that the disconnect happened cleanly.
        if (error === undefined) {
          return
        }

        console.error(
          `User socket disconnected for user ID==${userId} at ${JSON.stringify(
            new Date(),
          )}. Error:`,
          error,
        )
        console.log(
          `Attempting to reconnect the web-socket listener for ${userId}`,
        )
        this.eventSubListener.start()
      },
    )
  }

  destroy() {
    console.log("Stopping the web-socket listener")
    this.eventSubListener.stop()
  }

  async init() {
    await this.fetchTwitchIdFromStorage()
    await this.addBotUserToAuthProvider()
    await this.addStreamerToken()
    await this.setUpEventListeners()
  }

  async fetchTwitchIdFromStorage() {
    const twitchId = await this.storageLayer.getPrimaryBotTwitchId()
    if (twitchId === null) {
      throw new Error(
        "No primary bot Twitch ID found in the database. Run get-tokens.ts to get a token for the bot.",
      )
    }

    this.twitchId = twitchId
  }

  async addBotUserToAuthProvider() {
    const { token, name } = await this.storageLayer.getTwitchToken(
      this.twitchId,
    )

    this.name = name

    console.log(
      `Adding user to AuthProvider: bot name: ${name}. Channel name: ${process.env.TWITCH_CHANNEL_NAME}`,
    )

    try {
      this.authProvider.addUser(this.twitchId, token, ["chat"])
    } catch {
      // DO NOT PRINT THIS ERROR; it has secrets in it!
      throw new Error(
        "Couldn't call addUser. Probably sent a bad refresh token. Follow https://twurple.js.org/docs/examples/chat/basic-bot.html to fix it.",
      )
    }

    this.authProvider.onRefresh(
      async (userId: string, newTokenData: AccessToken) => {
        await this.storageLayer.refreshTwitchToken(userId, newTokenData)
      },
    )
  }

  /**
   * Adds the streamer's token to the AuthProvider that we use. This is required
   * by some websocket subscriptions. See the Discord thread below where the
   * creator of Twurple talks about how you can't use just any token to
   * subscribe to certain events.
   * @see
   * https://discord.com/channels/325552783787032576/1190377507279614103
   */
  async addStreamerToken() {
    const channelInfo = await this.apiClient.users.getUserByName(
      this.twitchChannelName,
    )

    if (channelInfo == null) {
      throw new Error(
        `Couldn't look up Twitch user by name: ${this.twitchChannelName}`,
      )
    }

    if (channelInfo.id === this.twitchId) {
      return
    }
    console.log(
      `The bot account (${this.name}) does not match the channel name \
(${this.twitchChannelName}). The streamer's token is required to subscribe to \
websocket events, so we're going to try to fetch ${this.twitchChannelName}'s \
token from the database now. If this doesn't work, then you need to run \
get-tokens.ts.`,
    )
    const { token } = await this.storageLayer.getTwitchToken(channelInfo.id)

    try {
      this.authProvider.addUser(channelInfo.id, token, ["chat"])
    } catch {
      // DO NOT PRINT THIS ERROR; it has secrets in it!
      throw new Error(
        "Couldn't call addUser. Probably sent a bad refresh token.",
      )
    }
  }

  getRankMessage = (oldRank: number, newRank: number) => {
    switch (oldRank) {
      case -1: {
        return `They went from being unranked to being #${newRank}`
      }
      case newRank: {
        return `Their rank stayed the same at #${oldRank}`
      }
      default: {
        return `Their rank went from #${oldRank} → #${newRank}`
      }
    }
  }

  userGiftPoints = async (params: string[], context: CommandContext) => {
    if (params.length === 0) {
      await context.reply(
        `Usage: ${commandPrefix}gift USER_NAME [NUM_POINTS=1] (can be negative)`,
      )
      return
    }

    let userName = params[0] as string
    let twitchId: string | undefined
    let profilePictureUrl: string | undefined

    try {
      const user = await this.apiClient.users.getUserByName(userName)
      if (user === null) {
        return context.reply(
          `Could not find a Twitch user by the name "${userName}" (did you make a typo?).`,
        )
      }
      twitchId = user.id
      profilePictureUrl = user.profilePictureUrl

      // Update their name to match what THEY want, not what *I* typed.
      userName = user.displayName
    } catch (error) {
      console.error(`Error looking up user by name "${userName}":`, error)
      return context.reply("There was an error looking up that user.")
    }

    const pointsString = params[1] ?? "1"
    const numPoints = Number.parseInt(pointsString, 10)
    if (Number.isNaN(numPoints)) {
      return context.reply(
        `"${pointsString}" is not a valid number of points! 😡`,
      )
    }

    try {
      await this.storageLayer.updateProfilePicture(
        twitchId,
        userName,
        profilePictureUrl,
      )
    } catch {
      const errorMessage =
        "There was a database error updating their profile picture. Moving on anyway."
      console.error(errorMessage)
      await context.reply(errorMessage)
    }

    try {
      const { newNumPoints, oldRank, newRank } =
        await this.storageLayer.modifyPoints(twitchId, userName, numPoints)

      const rankMessage = this.getRankMessage(oldRank, newRank)
      await context.reply(
        `Gifted ${numPoints} point(s) to ${userName}. New total: ${newNumPoints} point(s). ${rankMessage}. See point rankings at https://a.bot.land/points`,
      )
    } catch {
      return context.reply("There was a database error modifying points")
    }
  }

  say = async (message: string) => {
    await this.chat.say(this.twitchChannelName, message)
  }

  /**
   * @param replyToMessage This can be a message ID (a UUID) or the
   * message object itself.
   */
  reply = async (text: string, replyToMessage: GenericMessage) => {
    await this.chat.say(this.twitchChannelName, text, {
      replyTo: replyToMessage as ChatMessage,
    })
  }

  private isPrivilegedUser(user: ChatUser): boolean {
    return user.isMod || user.isBroadcaster
  }

  private processPotentialCommand = async (
    _user: string,
    text: string,
    msg: ChatMessage,
  ) => {
    const commandData = getCommandAndParams(text)

    if (commandData === null) {
      return
    }

    const command = this.commands.get(commandData.name)
    if (command === undefined) {
      return
    }

    // Allow privileged users to bypass the cooldown
    if (!this.isCommandReady(command) && !this.isPrivilegedUser(msg.userInfo)) {
      return
    }

    const context = new CommandContext(this, msg)

    if (!this.canUserExecuteCommand(msg.userInfo, command)) {
      return this.reply(
        "You don't have permission to do that!",

        // This is sort of hacky. Ideally, we would have ChatMessage implement
        // GenericMessage.
        msg as GenericMessage,
      )
    }

    // TODO: make sure to set this again
    // command.lastExecutionTimeOnTwitch = Date.now()
    await command.execute(commandData.params, context)
  }

  private canUserExecuteCommand(user: ChatUser, command: Command): boolean {
    if (command.isPrivileged) {
      return this.isPrivilegedUser(user)
    }

    return true
  }

  /**
   * Checks to see if the command is on cooldown.
   */
  private isCommandReady(command: Command): boolean {
    // const lastExecutionTimeOnTwitch = command.lastExecutionTimeOnTwitch
    // TODO: delete this line
    void command
    // TODO: get cooldowns working properly again
    const lastExecutionTimeOnTwitch = 0
    const now = Date.now()
    return now - lastExecutionTimeOnTwitch > GLOBAL_COMMAND_COOLDOWN
  }

  private onMessage = async (
    _channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ) => {
    await this.processPotentialCommand(user, text, msg)
  }
}
