import { GenericBot, type GenericMessage } from "./GenericBot.js"

export class CommandContext {
  bot: GenericBot
  chatMessage: GenericMessage
  constructor(bot: GenericBot, chatMessage: GenericMessage) {
    this.bot = bot
    this.chatMessage = chatMessage
  }

  say = async (text: string): Promise<void> => {
    return this.bot.say(text)
  }
  reply = async (text: string): Promise<void> => {
    return this.bot.reply(text, this.chatMessage)
  }
}
