import { ApiClient } from "@twurple/api"
import type { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient, type ChatUser, LogLevel } from "@twurple/chat"

import { BotCommand, type BotCommandHandler } from "./BotCommand"
import { BotCommandContext } from "./BotCommandContext"
import type { ChatMessage } from "./ChatMessage"
import type { CommandData } from "./CommandData"

const prefix = "!"

// (in milliseconds)
const GLOBAL_COMMAND_COOLDOWN = 4000

type MakeApiClient = (authProvider: RefreshingAuthProvider) => ApiClient
type MakeChatClient = (authProvider: RefreshingAuthProvider) => ChatClient

export class Bot {
  private readonly authProvider: RefreshingAuthProvider
  private readonly api: ApiClient
  private readonly chat: ChatClient

  // Keys: any known command name, including an alias. This means that "lang" and
  // "language" may both point to references to the same BotCommand.
  private readonly commands = new Map<string, BotCommand>()

  constructor({
    authProvider,
    makeApiClient,
    makeChatClient,
  }: {
    authProvider: RefreshingAuthProvider
    makeApiClient?: MakeApiClient | undefined
    makeChatClient?: MakeChatClient | undefined
  }) {
    this.authProvider = authProvider

    this.addBuiltinCommands()

    const logLevel = LogLevel.ERROR

    this.api =
      makeApiClient === undefined
        ? new ApiClient({
            authProvider,
            logger: { minLevel: logLevel },
          })
        : makeApiClient(authProvider)

    this.chat =
      makeChatClient === undefined
        ? new ChatClient({
            logger: { minLevel: logLevel },
            authProvider,

            // This prevents us from having user-level rate limits
            isAlwaysMod: true,
            // TODO: stop hard-coding this
            channels: ["AdamLearnsLive"],
          })
        : makeChatClient(authProvider)

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
    this.addEditComCommand()
    this.addDelComCommand()
    this.addAliasComCommand()
    this.addUnaliasComCommand()
    this.addAlias("acom", "addcom")
    this.addAlias("dcom", "delcom")
    this.addAlias("ecom", "editcom")
    this.addAlias("alias", "aliascom")
    this.addAlias("unalias", "unaliascom")
  }

  userDeleteCommand = async (params: string[], context: BotCommandContext) => {
    if (params.length === 0) {
      await context.reply(`Usage: ${prefix}delcom COMMAND_NAME`)
      return
    }

    const commandName = params[0] as string

    if (!this.commands.has(commandName)) {
      return context.reply(`Command "${commandName}" doesn't exist!`)
    }

    const canBeDeleted = this.commands.get(commandName)?.canBeDeleted
    if (!canBeDeleted) {
      return context.reply(
        `No no no! Command "${commandName}" is marked such that it cannot be deleted!`,
      )
    }

    const allCommandNames = this.getAllNamesOfCommand(commandName)
    for (const name of allCommandNames) {
      this.commands.delete(name)
    }

    allCommandNames.splice(allCommandNames.indexOf(commandName), 1)

    const aliasMessage =
      allCommandNames.length > 0
        ? ` Aliases which will no longer work: ${allCommandNames.join(", ")}`
        : ""

    await context.reply(
      `Command "${commandName}" successfully deleted!${aliasMessage}`,
    )
  }

  addDelComCommand() {
    this.addCommand({
      name: "delcom",
      handler: this.userDeleteCommand,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  userEditCommand = async (params: string[], context: BotCommandContext) => {
    if (params.length < 2) {
      await context.reply(`Usage: ${prefix}editcom COMMAND_NAME RESPONSE`)
      return
    }

    const commandName = params[0] as string

    if (!this.commands.has(commandName)) {
      return context.reply(`Command "${commandName}" doesn't exist!`)
    }

    const command = this.commands.get(commandName) as BotCommand
    if (!command.isTextCommand) {
      return context.reply(
        `Command "${commandName}" cannot be edited because it is not a text command.`,
      )
    }

    const response = params.slice(1).join(" ")

    const handler = this.makeTextCommandHandler(response)

    command.handler = handler

    await context.reply(`Command "${commandName}" successfully edited!`)
  }

  addEditComCommand() {
    this.addCommand({
      name: "editcom",
      handler: this.userEditCommand,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  userUnaliasCommand = async (params: string[], context: BotCommandContext) => {
    if (params.length === 0) {
      await context.reply(
        `Usage: ${prefix}unaliascom COMMAND_ALIAS. Note that this can only remove a NAME of a command, not the command itself.`,
      )
      return
    }

    const alias = params[0] as string
    const allCommandNames = this.getAllNamesOfCommand(alias)
    if (allCommandNames.length === 0) {
      await context.reply(`There is no command by the name "${alias}"`)
      return
    }
    if (allCommandNames.length === 1) {
      await context.reply(
        `You cannot use this command to delete a command, only remove a name, and "${alias}" is the only remaining name. Try "${prefix}delcom ${alias}".`,
      )
      return
    }
    this.commands.delete(alias)
    allCommandNames.splice(allCommandNames.indexOf(alias), 1)
    await context.reply(
      `Alias "${alias}" removed. Remaining names for the command: ${allCommandNames.join(
        ", ",
      )}`,
    )
  }

  addUnaliasComCommand() {
    this.addCommand({
      name: "unaliascom",
      handler: this.userUnaliasCommand,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  userAliasCommand = async (params: string[], context: BotCommandContext) => {
    if (params.length < 2) {
      await context.reply(
        `Usage: ${prefix}aliascom COMMAND_ALIAS COMMAND_TARGET (e.g. "${prefix}aliascom lang language", "lang" will point to the "language" command)`,
      )
      return
    }

    const alias = params[0] as string
    const targetCommandName = params[1] as string
    try {
      this.addAlias(alias, targetCommandName)
      await context.reply(
        `Alias "${alias}" → "${targetCommandName}" successfully added!`,
      )
    } catch (error) {
      let reason = "unknown error"
      if (error instanceof Error) {
        reason = error.message
      }
      return context.reply(`Couldn't add alias: ${reason}`)
    }
  }

  addAliasComCommand() {
    this.addCommand({
      name: "aliascom",
      handler: this.userAliasCommand,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  userAddCommand = async (params: string[], context: BotCommandContext) => {
    if (params.length < 2) {
      await context.reply(`Usage: ${prefix}addcom COMMAND_NAME RESPONSE`)
      return
    }

    const commandName = params[0] as string

    if (this.commands.has(commandName)) {
      return context.reply(`Command "${commandName}" already exists!`)
    }

    // Combine all the params after the command name into one string
    const response = params.slice(1).join(" ")

    context.bot.addTextCommand(commandName, response)

    await context.reply(`Command "${commandName}" successfully added!`)
  }

  addAddComCommand() {
    this.addCommand({
      name: "addcom",
      handler: this.userAddCommand,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  private makeTextCommandHandler(response: string): BotCommandHandler {
    return async (params: string[], context: BotCommandContext) => {
      let nameTag = ""
      if (params[0]?.startsWith("@")) {
        nameTag = `${params[0]} `
      }

      await context.say(nameTag + response)
    }
  }

  addTextCommand(name: string, response: string) {
    const handler = this.makeTextCommandHandler(response)
    this.addCommand({ name, handler })
  }

  addCommand({
    name,
    handler,
    isPrivileged = false,
    canBeDeleted = true,
    isTextCommand = true,
  }: {
    name: string
    handler: BotCommandHandler
    isPrivileged?: boolean
    canBeDeleted?: boolean
    isTextCommand?: boolean
  }) {
    if (this.commands.has(name)) {
      throw new Error("Command is already defined")
    }

    const command = new BotCommand({
      handler,
      isPrivileged,
      canBeDeleted,
      isTextCommand,
    })

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

  getAllNamesOfCommand(commandName: string): string[] {
    const names = []

    for (const [name, command] of this.commands.entries()) {
      if (command === this.commands.get(commandName)) {
        names.push(name)
      }
    }

    return names
  }

  async say(channel: string, message: string) {
    await this.chat.say(channel, message)
  }

  /**
   * @param replyToMessage This can be a message ID (a UUID) or the
   * message object itself.
   */
  async reply(
    channel: string,
    text: string,
    replyToMessage: string | ChatMessage,
  ): Promise<void> {
    await this.chat.say(channel, text, { replyTo: replyToMessage })
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

  private isPrivilegedUser(user: ChatUser): boolean {
    return user.isMod || user.isBroadcaster
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

    // Allow privileged users to bypass the cooldown
    if (!this.isCommandReady(command) && !this.isPrivilegedUser(msg.userInfo)) {
      return
    }

    const context = new BotCommandContext(this, msg)

    if (!this.canUserExecuteCommand(msg.userInfo, command)) {
      return this.reply(channel, "You don't have permission to do that!", msg)
    }

    command.lastExecutionTimeOnTwitch = Date.now()
    await command.execute(commandData.params, context)
  }

  private canUserExecuteCommand(user: ChatUser, command: BotCommand): boolean {
    if (command.isPrivileged) {
      return this.isPrivilegedUser(user)
    }

    return true
  }

  /**
   * Checks to see if the command is on cooldown.
   */
  private isCommandReady(command: BotCommand): boolean {
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
