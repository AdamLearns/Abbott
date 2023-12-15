import { ApiClient } from "@twurple/api"
import type { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient, type ChatUser, LogLevel } from "@twurple/chat"
import { sql } from "kysely"
import { UUID, uuidv7 } from "uuidv7"

import type { CommandData } from "../commands/CommandData"
import { db } from "../database/database"

import { BotCommand, type BotCommandHandler } from "./BotCommand"
import { BotCommandContext } from "./BotCommandContext"
import type { ChatMessage } from "./ChatMessage"

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

  async init() {
    await this.addBuiltinCommands()
    await this.loadTextCommandsFromDatabase()
  }

  /**
   * These should be added before we load any user-defined commands,
   * that way the user-defined ones can't squat on the names.
   */
  async addBuiltinCommands() {
    await this.addAddComCommand()
    await this.addEditComCommand()
    await this.addDelComCommand()
    await this.addAliasComCommand()
    await this.addUnaliasComCommand()
    await this.addAlias("acom", "addcom")
    await this.addAlias("dcom", "delcom")
    await this.addAlias("ecom", "editcom")
    await this.addAlias("alias", "aliascom")
    await this.addAlias("unalias", "unaliascom")
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

    const command = this.commands.get(commandName) as BotCommand

    await db
      .deleteFrom("commands")
      .where("id", "=", command.id.toString())
      .execute()

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

  async addDelComCommand() {
    return this.addBuiltInCommand("delcom", this.userDeleteCommand)
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

    await db
      .updateTable("text_command_responses")
      .set({
        response,
        updated_at: sql`now()`,
      })
      .where("id", "=", command.id.toString())
      .execute()

    const handler = this.makeTextCommandHandler(response)

    command.handler = handler

    await context.reply(`Command "${commandName}" successfully edited!`)
  }

  async addEditComCommand() {
    return this.addBuiltInCommand("editcom", this.userEditCommand)
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

    const command = this.commands.get(alias) as BotCommand

    await db
      .deleteFrom("command_names")
      .where("id", "=", command.id.toString())
      .where("name", "=", alias)
      .execute()

    this.commands.delete(alias)
    allCommandNames.splice(allCommandNames.indexOf(alias), 1)
    await context.reply(
      `Alias "${alias}" removed. Remaining names for the command: ${allCommandNames.join(
        ", ",
      )}`,
    )
  }

  async addUnaliasComCommand() {
    return this.addBuiltInCommand("unaliascom", this.userUnaliasCommand)
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
      await this.addAlias(alias, targetCommandName)

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

  async addAliasComCommand() {
    return this.addBuiltInCommand("aliascom", this.userAliasCommand)
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

    await context.bot.addCommand({ name: commandName, textResponse: response })

    await context.reply(`Command "${commandName}" successfully added!`)
  }

  async addAddComCommand() {
    return this.addBuiltInCommand("addcom", this.userAddCommand)
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

  /**
   * Adds a built-in command, which is just a command that is considered
   * privileged, non-text, and can't be deleted.
   */
  addBuiltInCommand = async (name: string, handler: BotCommandHandler) => {
    return this.addCommand({
      name,
      handler,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  async addCommand({
    name,
    handler,
    textResponse,
    isPrivileged = false,
    canBeDeleted = true,
  }: {
    name: string
    handler?: BotCommandHandler | undefined
    textResponse?: string | undefined
    isPrivileged?: boolean
    canBeDeleted?: boolean
  }) {
    if (this.commands.has(name)) {
      throw new Error("Command is already defined")
    }

    if (handler === undefined) {
      if (textResponse === undefined) {
        throw new Error("Must provide either a handler or a text response")
      }
      handler = this.makeTextCommandHandler(textResponse)
    }

    const response = await db
      .selectFrom("commands")
      .innerJoin("command_names", "commands.id", "command_names.id")
      .where("command_names.name", "=", name)
      .select(["commands.id"])
      .executeTakeFirst()

    let id = response?.id

    if (!id) {
      id = uuidv7()

      await db.transaction().execute(async (trx) => {
        await trx
          .insertInto("commands")
          .values({
            id: id as string,
            is_privileged: isPrivileged,
            can_be_deleted: canBeDeleted,
          })
          .execute()

        await trx
          .insertInto("command_names")
          .values({
            id: id as string,
            name,
          })
          .execute()

        if (textResponse) {
          await trx
            .insertInto("text_command_responses")
            .values({
              id: id as string,
              response: textResponse,
            })
            .execute()
        }
      })
    }

    const command = new BotCommand({
      handler,
      id: UUID.parse(id),
      isPrivileged,
      canBeDeleted,
      isTextCommand: textResponse !== undefined,
    })

    this.commands.set(name, command)
  }

  async addAlias(alias: string, targetCommandName: string) {
    if (!this.commands.has(targetCommandName)) {
      throw new Error("There is no command by that name")
    }

    if (this.commands.has(alias)) {
      throw new Error("Alias is already defined")
    }

    const command = this.commands.get(targetCommandName) as BotCommand

    await db.transaction().execute(async (trx) => {
      // If the alias already exists and points to the correct command in the
      // database, then don't do anything. This is so that we don't get errors
      // trying to add the built-in aliases every time the bot starts up.
      const response = await trx
        .selectFrom("commands")
        .innerJoin("command_names", "commands.id", "command_names.id")
        .where("commands.id", "=", command.id.toString())
        .where("command_names.name", "in", [alias, targetCommandName])
        .select(["command_names.name"])
        .execute()

      if (response.length !== 2) {
        await trx
          .insertInto("command_names")
          .values({
            id: command.id.toString(),
            name: alias,
          })
          .execute()
      }
    })

    this.commands.set(alias, this.commands.get(targetCommandName) as BotCommand)
  }

  loadTextCommandsFromDatabase = async () => {
    await db.transaction().execute(async (trx) => {
      const response = await trx
        .selectFrom("commands")
        .innerJoin("command_names", "commands.id", "command_names.id")
        .innerJoin(
          "text_command_responses",
          "commands.id",
          "text_command_responses.id",
        )
        .select([
          "commands.id",
          "command_names.name",
          "commands.is_privileged",
          "commands.can_be_deleted",
          "text_command_responses.response",
        ])
        .execute()
      for (const row of response) {
        const id = UUID.parse(row.id)
        const name = row.name
        const isPrivileged = row.is_privileged
        const canBeDeleted = row.can_be_deleted
        const textResponse = row.response
        const handler = this.makeTextCommandHandler(textResponse)

        const commandWithId = [...this.commands.values()].find((command) =>
          command.id.equals(id),
        )

        if (commandWithId === undefined) {
          const command = new BotCommand({
            id,
            handler,
            isPrivileged,
            canBeDeleted,
          })
          this.commands.set(name, command)
        } else {
          this.commands.set(name, commandWithId)
        }
      }
    })
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
