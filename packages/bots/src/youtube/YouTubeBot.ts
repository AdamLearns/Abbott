import { BotDatabase, type BotStorageLayer } from "abbott-database"
import {
  sendChatMessage,
  type OAuth2Client,
  type YouTubeMessage,
} from "youtube-api"

import { type Command } from "../commands/Command.js"
import { CommandContext } from "../commands/CommandContext.js"
import { getCommandAndParams } from "../commands/CommandData.js"
import { GenericBot, type GenericMessage } from "../commands/GenericBot.js"
import type { InMemoryCommands } from "../commands/InMemoryCommands.js"
import { MAX_YOUTUBE_CHAT_MESSAGE_LENGTH } from "../constants.js"
import { emitter } from "../events/emitter.js"

/**
 * Number of milliseconds prior to the bot running where we won't consider
 * messages that were received. This is because when starting the bot, we end up
 * fetching every single message since the beginning of the stream's chat.
 */
const rejectMessagesBeforeTime = 60_000

export class YouTubeBot extends GenericBot {
  #liveChatId: string | undefined
  #auth: OAuth2Client
  #commands: InMemoryCommands
  #startDate: Date = new Date()

  constructor({
    auth,
    commands,
    storageLayer,
  }: {
    auth: OAuth2Client
    commands: InMemoryCommands
    storageLayer?: BotStorageLayer | undefined
  }) {
    super(commands, storageLayer ?? new BotDatabase())
    this.#auth = auth
    this.#commands = commands
    emitter.onYouTubeStreamLive(this.youTubeStreamWentLive)
    emitter.onYouTubeMessagesReceived(this.receivedYouTubeMessages)
  }

  sayTextCommandResponse = async (commandName: string, text: string) => {
    if (text.length > MAX_YOUTUBE_CHAT_MESSAGE_LENGTH) {
      // Note: at the time of writing, I'm not including the prefix here because
      // it'll cause the bot to trigger itself with the command.
      const firstPart = `${commandName} too long for YouTube; view full response here https://a.bot.land/?query=${commandName} `
      const remainingChars = MAX_YOUTUBE_CHAT_MESSAGE_LENGTH - firstPart.length
      text = firstPart + text.slice(0, remainingChars - 1) + "…"
    }
    return this.say(text)
  }

  say = async (text: string): Promise<void> => {
    if (this.#liveChatId === undefined) {
      console.error(
        "Tried to send a message to YouTube, but the live chat ID is not set.",
      )
      return
    }
    await sendChatMessage(this.#auth, this.#liveChatId, text)
  }
  reply = async (
    text: string,
    replyToMessage: GenericMessage,
  ): Promise<void> => {
    const message = replyToMessage as YouTubeMessage
    const nameAndColon = "@" + message.authorDisplayName + ": "
    text =
      text.slice(0, MAX_YOUTUBE_CHAT_MESSAGE_LENGTH - nameAndColon.length - 1) +
      "…"
    return this.say(nameAndColon + text)
  }

  youTubeStreamWentLive = async (liveChatId: string) => {
    this.#liveChatId = liveChatId
    await sendChatMessage(
      this.#auth,
      this.#liveChatId,
      "Hello! I am a bot. I am now online. 🤖",
    )
  }

  receivedYouTubeMessages = async (messages: YouTubeMessage[]) => {
    for (const message of messages) {
      if (
        message.publishedAt.getTime() <
        this.#startDate.getTime() - rejectMessagesBeforeTime
      ) {
        continue
      }
      await this.processPotentialCommand(message)
    }
  }

  private processPotentialCommand = async (message: YouTubeMessage) => {
    const { messageText, isPrivileged } = message

    const commandData = getCommandAndParams(messageText)

    if (commandData === null) {
      return
    }

    const command = this.#commands.get(commandData.name)
    if (command === undefined) {
      return
    }

    // Allow privileged users to bypass the cooldown
    if (!this.isCommandReady(command) && !isPrivileged) {
      return
    }

    const context = new CommandContext(this, message as GenericMessage)

    if (!this.canUserExecuteCommand(isPrivileged, command)) {
      return this.reply(
        "You don't have permission to do that!",
        message as GenericMessage,
      )
    }

    // TODO: make sure to set this again
    // command.lastExecutionTimeOnTwitch = Date.now()
    await command.execute(commandData.params, context)
  }

  private isCommandReady(command: Command): boolean {
    // TODO: actually code this
    void command
    return true
  }

  // TODO: see if we can refactor with the Twitch version of the same method
  private canUserExecuteCommand(
    isUserPrivileged: boolean,
    command: Command,
  ): boolean {
    if (command.isPrivileged) {
      return isUserPrivileged
    }

    return true
  }
}
