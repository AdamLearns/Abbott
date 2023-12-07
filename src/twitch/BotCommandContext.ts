import type { ChatMessage } from "@twurple/chat"

import type { Bot } from "./Bot"

export class BotCommandContext {
  #bot: Bot

  constructor(
    bot: Bot,
    public readonly msg: ChatMessage,
  ) {
    this.#bot = bot
  }
}
