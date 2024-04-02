import { exec } from "node:child_process"

import {
  BotDatabase,
  uuidv7,
  type BotStorageLayer,
  UUID,
  type GetQuote,
  type DatabaseTextCommand,
} from "abbott-database"
import { formatISO } from "date-fns"

import { commandPrefix } from "../constants.js"
import { Bot as TwitchBot } from "../twitch/Bot.js"

import { type CommandHandler } from "./Command.js"
import { Command } from "./Command.js"
import { type CommandContext } from "./CommandContext.js"

export class InMemoryCommands {
  // Keys: any known command name, including an alias. This means that "lang" and
  // "language" may both point to references to the same BotCommand.
  private readonly commands = new Map<string, Command>()
  private readonly storageLayer: BotStorageLayer

  constructor(storageLayer?: BotStorageLayer | undefined) {
    this.storageLayer = storageLayer ?? new BotDatabase()
  }

  async init() {
    await this.addBuiltinCommands()
    await this.loadTextCommands()
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
    await this.addAlertCommand()
    await this.addAddQuoteCommand()
    await this.addGetQuoteCommand()
    await this.addDelQuoteCommand()
    await this.addNumQuotesCommand()
    await this.addGiftPointsCommand()
    await this.addJoinGameCommand()
    await this.addStartGameCommand()
    await this.addGiveGameCommand()
    await this.addAlias("acom", "addcom")
    await this.addAlias("dcom", "delcom")
    await this.addAlias("ecom", "editcom")
    await this.addAlias("alias", "aliascom")
    await this.addAlias("unalias", "unaliascom")
    await this.addAlias("aq", "addquote")
    await this.addAlias("quoteadd", "addquote")
    await this.addAlias("quote", "getquote")
    await this.addAlias("gq", "getquote")
    await this.addAlias("quoteget", "getquote")
    await this.addAlias("deletequote", "delquote")
    await this.addAlias("quotedelete", "delquote")
  }

  async addNumQuotesCommand() {
    return this.addCommand({
      name: "numquotes",
      handler: this.userGetNumQuotes,
      isPrivileged: false, // one of the few built-in commands that isn't privileged
      canBeDeleted: false,
    })
  }

  async addGiftPointsCommand() {
    return this.addCommand({
      name: "gift",
      handler: this.userGiftPoints,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  async addJoinGameCommand() {
    return this.addCommand({
      name: "join",
      handler: this.joinGame,
      isPrivileged: false,
      canBeDeleted: false,
    })
  }

  async addStartGameCommand() {
    return this.addCommand({
      name: "startgame",
      handler: this.startGame,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  async addGiveGameCommand() {
    return this.addCommand({
      name: "give",
      handler: this.giveGame,
      isPrivileged: false,
      canBeDeleted: false,
    })
  }

  giveGame = async (params: string[], context: CommandContext) => {
    await (context.bot instanceof TwitchBot
      ? context.bot.userGiveGame(params, context)
      : context.bot.say("This command is only available in Twitch chat."))
  }

  startGame = async (params: string[], context: CommandContext) => {
    await (context.bot instanceof TwitchBot
      ? context.bot.userStartGame(params, context)
      : context.bot.say("This command is only available in Twitch chat."))
  }

  joinGame = async (params: string[], context: CommandContext) => {
    await (context.bot instanceof TwitchBot
      ? context.bot.userJoinGame(params, context)
      : context.bot.say("This command is only available in Twitch chat."))
  }

  userGiftPoints = async (params: string[], context: CommandContext) => {
    await (context.bot instanceof TwitchBot
      ? context.bot.userGiftPoints(params, context)
      : context.bot.say("This command is only available in Twitch chat."))
  }

  async addAlertCommand() {
    return this.addBuiltInCommand("alert", this.playAlertSound)
  }

  private playAlertSound = () => {
    exec("afplay ./alert.wav", (error, _stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`)
        return
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`)
        return
      }
    })
  }

  async addUnaliasComCommand() {
    return this.addBuiltInCommand("unaliascom", this.userUnaliasCommand)
  }

  userAliasCommand = async (params: string[], context: CommandContext) => {
    if (params.length < 2) {
      await context.reply(
        `Usage: ${commandPrefix}aliascom COMMAND_ALIAS COMMAND_TARGET (e.g. "${commandPrefix}aliascom lang language", "lang" will point to the "language" command)`,
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

  async addAddComCommand() {
    return this.addBuiltInCommand("addcom", this.userAddCommand)
  }

  async addAlias(alias: string, targetCommandName: string) {
    if (!this.commands.has(targetCommandName)) {
      throw new Error("There is no command by that name")
    }

    if (this.commands.has(alias)) {
      throw new Error("Alias is already defined")
    }

    const command = this.commands.get(targetCommandName) as Command

    try {
      await this.storageLayer.addAlias(
        { id: command.id.toString(), name: alias },
        targetCommandName,
      )
    } catch (error) {
      console.error(`Error aliasing ${alias}:`, error)
      throw new Error("There was a database error aliasing that command.")
    }

    this.setCommand(alias, this.commands.get(targetCommandName) as Command)
  }

  async loadTextCommands() {
    let response: DatabaseTextCommand[] = []
    try {
      response = await this.storageLayer.loadTextCommands()
    } catch (error) {
      console.error("Error loading text commands from database:", error)
      throw error
    }
    for (const row of response) {
      const id = UUID.parse(row.id)
      const name = row.name
      const isPrivileged = row.is_privileged
      const canBeDeleted = row.can_be_deleted
      const textResponse = row.response
      const handler = this.makeTextCommandHandler(name, textResponse)

      const commandWithId = this.getByUuid(id)

      if (commandWithId === undefined) {
        const command = new Command({
          id,
          handler,
          isPrivileged,
          canBeDeleted,
        })
        this.setCommand(name, command)
      } else {
        this.setCommand(name, commandWithId)
      }
    }
  }

  /**
   * Adds a built-in command, which is just a command that is considered
   * privileged, non-text, and can't be deleted.
   */
  addBuiltInCommand = async (name: string, handler: CommandHandler) => {
    return this.addCommand({
      name,
      handler,
      isPrivileged: true,
      canBeDeleted: false,
    })
  }

  private makeTextCommandHandler(
    commandName: string,
    response: string,
  ): CommandHandler {
    return async (params: string[], context: CommandContext) => {
      let nameTag = ""
      if (params[0]?.startsWith("@")) {
        nameTag = `${params[0]} `
      }

      await context.bot.sayTextCommandResponse(commandName, nameTag + response)
    }
  }

  userAddCommand = async (
    params: string[],
    context: CommandContext,
  ): Promise<void> => {
    if (params.length < 2) {
      await context.reply(`Usage: ${commandPrefix}addcom COMMAND_NAME RESPONSE`)
      return
    }

    const commandName = params[0] as string

    const { commands } = context.bot

    if (commands.has(commandName)) {
      return context.reply(`Command "${commandName}" already exists!`)
    }

    // Combine all the params after the command name into one string
    const response = params.slice(1).join(" ")

    try {
      await this.addCommand({
        name: commandName,
        textResponse: response,
      })
    } catch {
      return context.reply("There was a database error adding that command")
    }

    await context.reply(`Command "${commandName}" successfully added!`)
  }

  async addCommand({
    name,
    handler,
    textResponse,
    isPrivileged = false,
    canBeDeleted = true,
  }: {
    name: string
    handler?: CommandHandler | undefined
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
      handler = this.makeTextCommandHandler(name, textResponse)
    }

    let id: string | undefined

    try {
      id = await this.storageLayer.findCommandByName(name)
      if (!id) {
        id = uuidv7()

        await this.storageLayer.addCommand({
          newCommand: {
            id,
            is_privileged: isPrivileged,
            can_be_deleted: canBeDeleted,
          },
          name,
          textResponse,
        })
      }
    } catch (error) {
      console.error(`Error adding command "${name}":`, error)
      throw error
    }

    const command = new Command({
      handler,
      id: UUID.parse(id),
      isPrivileged,
      canBeDeleted,
      isTextCommand: textResponse !== undefined,
    })

    this.setCommand(name, command)
  }

  async addDelComCommand() {
    return this.addBuiltInCommand("delcom", this.userDeleteCommand)
  }
  userDeleteCommand = async (params: string[], context: CommandContext) => {
    if (params.length === 0) {
      await context.reply(`Usage: ${commandPrefix}delcom COMMAND_NAME`)
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

    const command = this.commands.get(commandName) as Command

    try {
      await this.storageLayer.deleteCommand(command.id.toString())
    } catch (error) {
      console.error(`Error deleting ${commandName}:`, error)
      return context.reply("There was a database error deleting that command.")
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

  async addAddQuoteCommand() {
    return this.addBuiltInCommand("addquote", this.userAddQuote)
  }

  userAddQuote = async (params: string[], context: CommandContext) => {
    if (params.length < 2) {
      await context.reply(
        `Usage: ${commandPrefix}addquote AUTHOR QUOTE - the author cannot have spaces and the quote does not need quotation marks`,
      )
      return
    }

    const author = params[0] as string
    const quote = params.slice(1).join(" ")

    try {
      const quoteId = await this.storageLayer.addQuote(author, quote)
      await context.reply(`Quote #${quoteId} successfully added!`)
    } catch {
      return context.reply("There was a database error adding that quote")
    }
  }

  userGetNumQuotes = async (_params: string[], context: CommandContext) => {
    try {
      const numQuotes = await this.storageLayer.getNumQuotes()
      return context.reply(
        `There is a total of ${numQuotes} quote(s). Note that not all IDs up to that number may exist if quotes were deleted.`,
      )
    } catch {
      return context.reply(
        "There was a database error getting the number of quotes.",
      )
    }
  }

  userDelQuote = async (params: string[], context: CommandContext) => {
    if (params.length === 0) {
      await context.reply(`Usage: ${commandPrefix}delquote ID`)
      return
    }

    const idString = params[0] as string
    const id = Number.parseInt(idString, 10)
    if (Number.isNaN(id)) {
      return context.reply(`"${idString}" is not a valid quote ID! 😡`)
    }

    try {
      const deletedQuote = await this.storageLayer.deleteQuote(id)
      if (deletedQuote === undefined) {
        return context.reply(`Quote #${id} didn't exist!`)
      }
      await context.reply(
        `Deleted quote #${id}. Old contents: "${deletedQuote.quote}" - ${
          deletedQuote.author
        }, ${JSON.stringify(deletedQuote.quoted_at)}`,
      )
    } catch {
      return context.reply("There was a database error deleting that quote")
    }
  }

  async addDelQuoteCommand() {
    return this.addBuiltInCommand("delquote", this.userDelQuote)
  }

  userGetQuote = async (params: string[], context: CommandContext) => {
    const id = params.length > 0 ? (params[0] as string) : undefined

    let quote: GetQuote | undefined
    try {
      if (id === undefined) {
        quote = await this.storageLayer.getRandomQuote()
        if (quote === undefined) {
          return context.reply(`There are no quotes in the database.`)
        }
      } else {
        const quoteId = Number.parseInt(id, 10)
        if (Number.isNaN(quoteId)) {
          return context.reply(`"${id}" is not a valid quote ID! 😡`)
        }
        quote = await this.storageLayer.getQuote(quoteId)
        if (quote === undefined) {
          return context.reply(`There is no quote #${quoteId}`)
        }
      }
    } catch {
      return context.reply("There was a database error getting a quote")
    }

    const date = formatISO(quote.quoted_at, { representation: "date" })
    return context.reply(
      `Quote #${quote.id}: "${quote.quote}" - ${quote.author}, ${date}`,
    )
  }

  async addGetQuoteCommand() {
    return this.addCommand({
      name: "getquote",
      handler: this.userGetQuote,
      isPrivileged: false, // one of the few built-in commands that isn't privileged
      canBeDeleted: false,
    })
  }

  userEditCommand = async (params: string[], context: CommandContext) => {
    if (params.length < 2) {
      await context.reply(
        `Usage: ${commandPrefix}editcom COMMAND_NAME RESPONSE`,
      )
      return
    }

    const commandName = params[0] as string

    if (!this.commands.has(commandName)) {
      return context.reply(`Command "${commandName}" doesn't exist!`)
    }

    const command = this.commands.get(commandName) as Command
    if (!command.isTextCommand) {
      return context.reply(
        `Command "${commandName}" cannot be edited because it is not a text command.`,
      )
    }

    const response = params.slice(1).join(" ")

    try {
      await this.storageLayer.editCommand(command.id.toString(), response)
    } catch (error) {
      console.error(`Error editing ${commandName}:`, error)
      return context.reply("There was a database error editing that command.")
    }

    const handler = this.makeTextCommandHandler(commandName, response)

    command.handler = handler

    await context.reply(`Command "${commandName}" successfully edited!`)
  }

  async addEditComCommand() {
    return this.addBuiltInCommand("editcom", this.userEditCommand)
  }

  userUnaliasCommand = async (params: string[], context: CommandContext) => {
    if (params.length === 0) {
      await context.reply(
        `Usage: ${commandPrefix}unaliascom COMMAND_ALIAS. Note that this can only remove a NAME of a command, not the command itself.`,
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
        `You cannot use this command to delete a command, only remove a name, and "${alias}" is the only remaining name. Try "${commandPrefix}delcom ${alias}".`,
      )
      return
    }

    const command = this.commands.get(alias) as Command

    try {
      await this.storageLayer.deleteAliasOfCommand(command.id.toString(), alias)
    } catch (error) {
      console.error(`Error unaliasing ${alias}:`, error)
      return context.reply(
        "There was a database error unaliasing that command.",
      )
    }

    this.commands.delete(alias)
    allCommandNames.splice(allCommandNames.indexOf(alias), 1)
    await context.reply(
      `Alias "${alias}" removed. Remaining names for the command: ${allCommandNames.join(
        ", ",
      )}`,
    )
  }

  has(commandName: string): boolean {
    return this.commands.has(commandName)
  }

  get(commandName: string): Command | undefined {
    return this.commands.get(commandName)
  }

  delete(commandName: string): boolean {
    return this.commands.delete(commandName)
  }

  getByUuid(uuid: UUID): Command | undefined {
    for (const command of this.commands.values()) {
      if (command.id.equals(uuid)) {
        return command
      }
    }

    return undefined
  }

  /**
   * Wraps setting a command in the map to ensure that all values with the same
   * ID are actually the same exact object instance. This is needed for editing
   * commands and also for built-in commands so that we can load from the
   * database and point to the right handler in memory.
   */
  setCommand(name: string, command: Command) {
    for (const existingCommand of this.commands.values()) {
      if (
        existingCommand.id.equals(command.id) &&
        command !== existingCommand
      ) {
        throw new Error(
          `Any commands with the same ID must be the same object. Command name: ${name}. Command ID: ${command.id.toString()}`,
        )
      }
    }
    this.commands.set(name, command)
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
}
