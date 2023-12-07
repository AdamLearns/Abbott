import type { BotCommandContext } from "./BotCommandContext"

export type BotCommandHandler = (
  params: string[],
  context: BotCommandContext,
) => void | Promise<void>

export class BotCommand {
  #lastExecutionTimeOnTwitch = 0
  #handler: BotCommandHandler

  constructor(handler: BotCommandHandler) {
    this.#handler = handler
  }

  get lastExecutionTimeOnTwitch(): number {
    return this.#lastExecutionTimeOnTwitch
  }

  set lastExecutionTimeOnTwitch(value: number) {
    this.#lastExecutionTimeOnTwitch = value
  }

  execute(params: string[], context: BotCommandContext): void | Promise<void> {
    return this.#handler(params, context)
  }
}
