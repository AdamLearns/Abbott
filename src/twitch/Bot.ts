import { ApiClient } from "@twurple/api"
import type { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient, LogLevel } from "@twurple/chat"

import { BotCommand, type BotCommandHandler } from "./BotCommand"
import { BotCommandContext } from "./BotCommandContext"
import type { ChatMessage } from "./ChatMessage"
import type { CommandData } from "./CommandData"

const prefix = "!"

// (in milliseconds)
const GLOBAL_COMMAND_COOLDOWN = 4000

export class Bot {
  private readonly authProvider: RefreshingAuthProvider
  private readonly api: ApiClient
  private readonly chat: ChatClient

  // Keys: any known command name, including an alias. This means that "lang" and
  // "language" may both point to references to the same BotCommand.
  private readonly commands = new Map<string, BotCommand>()

  constructor({ authProvider }: { authProvider: RefreshingAuthProvider }) {
    this.authProvider = authProvider

    this.addBuiltinCommands()

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

  /**
   * These should be added before we load any user-defined commands,
   * that way the user-defined ones can't squat on the names.
   */
  addBuiltinCommands() {
    this.addAddComCommand()
  }

  addAddComCommand() {
    this.addCommand(
      "addcom",
      async (params: string[], context: BotCommandContext) => {
        if (params.length < 2) {
          await context.say("Usage: !addcom COMMAND_NAME RESPONSE")
          return
        }

        const commandName = params[0] as string

        if (this.commands.has(commandName)) {
          return context.say(`Command '${commandName}' already exists!`)
        }

        // Combine all the params after the command name into one string
        const response = params.slice(1).join(" ")

        context.bot.addTextCommand(commandName, response)

        await context.say(`Command '${commandName}' successfully added!`)
      },
    )
  }

  addTextCommand(name: string, response: string) {
    const handler = async (params: string[], context: BotCommandContext) => {
      let nameTag = ""
      if (params[0]?.startsWith("@")) {
        nameTag = `${params[0]} `
      }

      await context.say(nameTag + response)
    }
    this.addCommand(name, handler)
  }

  addCommand(name: string, handler: BotCommandHandler) {
    if (this.commands.has(name)) {
      throw new Error("Command is already defined")
    }

    const command = new BotCommand(handler)

    this.commands.set(name, command)
  }

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

    if (!this.canExecuteCommand(command)) {
      return
    }

    const context = new BotCommandContext(this, msg)
    command.lastExecutionTimeOnTwitch = Date.now()
    await command.execute(commandData.params, context)
  }

  private canExecuteCommand(command: BotCommand): boolean {
    const lastExecutionTimeOnTwitch = command.lastExecutionTimeOnTwitch
    const now = Date.now()
    return now - lastExecutionTimeOnTwitch > GLOBAL_COMMAND_COOLDOWN
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
