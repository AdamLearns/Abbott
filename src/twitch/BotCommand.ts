import type { BotCommandContext } from "./BotCommandContext"

export type BotCommandHandler = (
  params: string[],
  context: BotCommandContext,
) => void | Promise<void>

export class BotCommand {
  #name: string
  #handler: BotCommandHandler

  constructor(name: string, handler: BotCommandHandler) {
    this.#name = name
    this.#handler = handler
  }

  get name(): string {
    return this.#name
  }

  execute(params: string[], context: BotCommandContext): void | Promise<void> {
    return this.#handler(params, context)
  }
}
