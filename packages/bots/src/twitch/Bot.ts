import { exec } from "node:child_process"

import { ApiClient } from "@twurple/api"
import type { AccessToken, RefreshingAuthProvider } from "@twurple/auth"
import {
  ChatClient,
  type ChatUser,
  LogLevel,
  type ChatMessage,
} from "@twurple/chat"
import { EventSubWsListener } from "@twurple/eventsub-ws"
import { BotDatabase } from "abbott-database"
import type {
  BotStorageLayer,
  DatabaseTextCommand,
  GetQuote,
} from "abbott-database"
import { formatISO } from "date-fns"
import { UUID, uuidv7 } from "uuidv7"

import type { CommandData } from "../commands/CommandData.js"
import { emitter } from "../events/emitter.js"

import { BotCommand, type BotCommandHandler } from "./BotCommand.js"
import { BotCommandContext } from "./BotCommandContext.js"

const prefix = "!"

// (in milliseconds)
const GLOBAL_COMMAND_COOLDOWN = 4000

type MakeApiClient = (authProvider: RefreshingAuthProvider) => ApiClient
type MakeChatClient = (authProvider: RefreshingAuthProvider) => ChatClient

const logLevel = LogLevel.ERROR

export class Bot {
  private readonly storageLayer: BotStorageLayer
  private readonly chat: ChatClient
  private readonly apiClient: ApiClient
  private readonly authProvider: RefreshingAuthProvider
  private readonly twitchChannelName: string
  private readonly eventSubListener: EventSubWsListener
  private name = "unset" // the Twitch user name of the bot
  private twitchId = "unset"

  // Keys: any known command name, including an alias. This means that "lang" and
  // "language" may both point to references to the same BotCommand.
  private readonly commands = new Map<string, BotCommand>()

  constructor({
    twitchChannelName,
    authProvider,
    storageLayer,
    makeApiClient,
    makeChatClient,
  }: {
    twitchChannelName: string
    authProvider: RefreshingAuthProvider
    storageLayer?: BotStorageLayer | undefined
    makeApiClient?: MakeApiClient | undefined
    makeChatClient?: MakeChatClient | undefined
  }) {
    this.twitchChannelName = twitchChannelName
    this.authProvider = authProvider
    this.apiClient =
      makeApiClient === undefined
        ? new ApiClient({
            authProvider,
            logger: { minLevel: logLevel },
          })
        : makeApiClient(authProvider)

    this.storageLayer = storageLayer ?? new BotDatabase()

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

      emitter.sendStreamOnline(title)
    })

    this.eventSubListener.onUserSocketDisconnect(
      (userId: string, error?: Error) => {
        if (error === undefined) {
          console.log(`Web socket for userID==${userId} disconnected cleanly.`)
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
    await this.addBuiltinCommands()
    await this.loadTextCommands()
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
    await this.addFuzzyFindCommand()
    await this.addAddQuoteCommand()
    await this.addGetQuoteCommand()
    await this.addDelQuoteCommand()
    await this.addNumQuotesCommand()
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

    try {
      await this.storageLayer.editCommand(command.id.toString(), response)
    } catch (error) {
      console.error(`Error editing ${commandName}:`, error)
      return context.reply("There was a database error editing that command.")
    }

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

  async addAlertCommand() {
    return this.addBuiltInCommand("alert", this.playAlertSound)
  }

  private fuzzyFindCommands = async (
    params: string[],
    context: BotCommandContext,
  ) => {
    if (params.length === 0) {
      await context.reply(
        `Usage: ${prefix}ff COMMAND_NAME - this searches all text command responses for the string that you provide, that way, you can search for a command whose name you don't remember.`,
      )
      return
    }

    const searchString = params[0] as string

    let commandNames: string[]
    try {
      commandNames = await this.storageLayer.fuzzyFindCommands(searchString)
    } catch (error) {
      console.error(`Error fuzzy-finding ${searchString}:`, error)
      return context.reply(
        "There was a database error while trying to fuzzy-find.",
      )
    }

    const commandString = commandNames.join(", ").slice(0, 350)

    await context.reply(
      `Commands found matching "${searchString}": ${commandString}`,
    )
  }

  async addFuzzyFindCommand() {
    return this.addCommand({
      name: "ff",
      handler: this.fuzzyFindCommands,
      isPrivileged: false, // one of the few built-in commands that isn't privileged
      canBeDeleted: false,
    })
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

    try {
      await context.bot.addCommand({
        name: commandName,
        textResponse: response,
      })
    } catch {
      return context.reply("There was a database error adding that command")
    }

    await context.reply(`Command "${commandName}" successfully added!`)
  }

  async addAddComCommand() {
    return this.addBuiltInCommand("addcom", this.userAddCommand)
  }

  userAddQuote = async (params: string[], context: BotCommandContext) => {
    if (params.length < 2) {
      await context.reply(
        `Usage: ${prefix}addquote AUTHOR QUOTE - the author cannot have spaces and the quote does not need quotation marks`,
      )
      return
    }

    const author = params[0] as string
    const quote = params.slice(1).join(" ")

    try {
      const quoteId = await context.bot.storageLayer.addQuote(author, quote)
      await context.reply(`Quote #${quoteId} successfully added!`)
    } catch {
      return context.reply("There was a database error adding that quote")
    }
  }

  async addAddQuoteCommand() {
    return this.addBuiltInCommand("addquote", this.userAddQuote)
  }

  userDelQuote = async (params: string[], context: BotCommandContext) => {
    if (params.length === 0) {
      await context.reply(`Usage: ${prefix}delquote ID`)
      return
    }

    const idString = params[0] as string
    const id = Number.parseInt(idString, 10)
    if (Number.isNaN(id)) {
      return context.reply(`"${idString}" is not a valid quote ID! 😡`)
    }

    try {
      const deletedQuote = await context.bot.storageLayer.deleteQuote(id)
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

  userGetQuote = async (params: string[], context: BotCommandContext) => {
    const id = params.length > 0 ? (params[0] as string) : undefined

    let quote: GetQuote | undefined
    try {
      if (id === undefined) {
        quote = await context.bot.storageLayer.getRandomQuote()
        if (quote === undefined) {
          return context.reply(`There are no quotes in the database.`)
        }
      } else {
        const quoteId = Number.parseInt(id, 10)
        if (Number.isNaN(quoteId)) {
          return context.reply(`"${id}" is not a valid quote ID! 😡`)
        }
        quote = await context.bot.storageLayer.getQuote(quoteId)
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

  userGetNumQuotes = async (_params: string[], context: BotCommandContext) => {
    try {
      const numQuotes = await context.bot.storageLayer.getNumQuotes()
      return context.reply(
        `There is a total of ${numQuotes} quote(s). Note that not all IDs up to that number may exist if quotes were deleted.`,
      )
    } catch {
      return context.reply(
        "There was a database error getting the number of quotes.",
      )
    }
  }

  async addNumQuotesCommand() {
    return this.addCommand({
      name: "numquotes",
      handler: this.userGetNumQuotes,
      isPrivileged: false, // one of the few built-in commands that isn't privileged
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

    const command = new BotCommand({
      handler,
      id: UUID.parse(id),
      isPrivileged,
      canBeDeleted,
      isTextCommand: textResponse !== undefined,
    })

    this.setCommand(name, command)
  }

  /**
   * Wraps setting a command in the map to ensure that all values with the same
   * ID are actually the same exact object instance. This is needed for editing
   * commands and also for built-in commands so that we can load from the
   * database and point to the right handler in memory.
   */
  private setCommand(name: string, command: BotCommand) {
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

  async addAlias(alias: string, targetCommandName: string) {
    if (!this.commands.has(targetCommandName)) {
      throw new Error("There is no command by that name")
    }

    if (this.commands.has(alias)) {
      throw new Error("Alias is already defined")
    }

    const command = this.commands.get(targetCommandName) as BotCommand

    try {
      await this.storageLayer.addAlias(
        { id: command.id.toString(), name: alias },
        targetCommandName,
      )
    } catch (error) {
      console.error(`Error aliasing ${alias}:`, error)
      throw new Error("There was a database error aliasing that command.")
    }

    this.setCommand(alias, this.commands.get(targetCommandName) as BotCommand)
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
        this.setCommand(name, command)
      } else {
        this.setCommand(name, commandWithId)
      }
    }
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
    _user: string,
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
    console.info(`Channel: ${channel}, User: ${user}, Text: ${text}`)

    await this.processPotentialCommand(channel, user, text, msg)
  }
}
