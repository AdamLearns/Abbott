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
    return this.say("@" + message.authorDisplayName + ": " + text)
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
      await this.processPotentialCommand(
        message.messageText,
        message.isPrivileged,
      )
    }
  }

  private processPotentialCommand = async (
    text: string,
    isUserPrivileged: boolean,
  ) => {
    const commandData = getCommandAndParams(text)

    if (commandData === null) {
      return
    }

    const command = this.#commands.get(commandData.name)
    if (command === undefined) {
      return
    }

    // Allow privileged users to bypass the cooldown
    if (!this.isCommandReady(command) && !isUserPrivileged) {
      return
    }

    // TODO: the empty object is a horrible hack; we need a special type for this that I just haven't made yet
    const context = new CommandContext(this, {})

    if (!this.canUserExecuteCommand(isUserPrivileged, command)) {
      return this.reply(
        "You don't have permission to do that!",

        // TODO: fill this in with something real
        {},
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
