import { ApiClient } from "@twurple/api"
import type { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient, LogLevel } from "@twurple/chat"

import { BotCommand } from "./BotCommand"
import { BotCommandContext } from "./BotCommandContext"
import type { ChatMessage } from "./ChatMessage"
import type { CommandData } from "./CommandData"

const prefix = "!"

export class Bot {
  private readonly authProvider: RefreshingAuthProvider
  private readonly api: ApiClient
  private readonly chat: ChatClient

  // Keys: any known command name, including an alias. This means that "lang" and
  // "language" may both point to references to the same BotCommand.
  private readonly commands = new Map<string, BotCommand>()

  constructor({ authProvider }: { authProvider: RefreshingAuthProvider }) {
    this.authProvider = authProvider
    console.info("Created the bot, but it's not doing anything yet")

    const logLevel = LogLevel.ERROR
    this.api = new ApiClient({
      authProvider,
      logger: { minLevel: logLevel },
    })
    this.chat = new ChatClient({
      logger: { minLevel: logLevel },
      authProvider,

      // This prevents us from having user-level rate limits
      isAlwaysMod: true,
      // TODO: stop hard-coding this
      channels: ["AdamLearnsLive"],
    })

    // We need to process msg because it has all of the information and we may need that to determine whether someone typed a command
    this.chat.onMessage(this.onMessage)
    this.chat.connect()
  }

  addTextCommand(name: string, response: string) {
    const command = new BotCommand(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_params: string[], context: BotCommandContext) => {
        console.info(`You typed ${name}. The response is: ${response}`)
        await context.say(response)
      },
    )

    this.commands.set(name, command)
  }

  // alias: "lang"
  // targetCommandName: "language"
  addAlias(alias: string, targetCommandName: string) {
    if (!this.commands.has(targetCommandName)) {
      throw new Error("There is no command by that name")
    }

    if (this.commands.has(alias)) {
      throw new Error("Alias is already defined")
    }

    this.commands.set(alias, this.commands.get(targetCommandName) as BotCommand)
  }

  async say(channel: string, message: string) {
    await this.chat.say(channel, message)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getCommandAndParams(text: string, _message: ChatMessage): CommandData | null {
    const [command, ...params] = text.split(" ")
    if (!command?.startsWith(prefix)) {
      return null
    }
    const sliced = command.slice(prefix.length)
    return {
      params,
      name: sliced,
    }
  }

  private processPotentialCommand = async (
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ) => {
    const commandData = this.getCommandAndParams(text, msg)

    if (commandData === null) {
      return
    }

    const command = this.commands.get(commandData.name)
    if (command === undefined) {
      return
    }

    const context = new BotCommandContext(this, msg)
    await command.execute(commandData.params, context)
  }

  private onMessage = async (
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ) => {
    console.info(
      `Channel: ${channel}, User: ${user}, Text: ${text}, msg: ${JSON.stringify(
        msg,
      )}`,
    )

    await this.processPotentialCommand(channel, user, text, msg)
  }
}
