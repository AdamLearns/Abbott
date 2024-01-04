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

  /**
   * The broadcaster name may have a pound sign at the beginning of it.
   */
  get broadcasterName(): string {
    return this.msg.target
  }

  get bot(): Bot {
    return this.#bot
  }

  say = async (text: string): Promise<void> => {
    await this.#bot.say(this.broadcasterName, text)
  }
  reply = async (text: string) => {
    await this.#bot.reply(this.broadcasterName, text, this.msg)
  }
}
