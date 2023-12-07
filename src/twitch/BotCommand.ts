import type { BotCommandContext } from "./BotCommandContext"

export type BotCommandHandler = (
  params: string[],
  context: BotCommandContext,
) => void | Promise<void>

export class BotCommand {
  #handler: BotCommandHandler

  constructor(handler: BotCommandHandler) {
    this.#handler = handler
  }

  execute(params: string[], context: BotCommandContext): void | Promise<void> {
    return this.#handler(params, context)
  }
}
