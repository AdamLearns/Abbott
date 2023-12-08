import type { BotCommandContext } from "./BotCommandContext"

export type BotCommandHandler = (
  params: string[],
  context: BotCommandContext,
) => void | Promise<void>

export class BotCommand {
  #lastExecutionTimeOnTwitch = 0
  #handler: BotCommandHandler
  #isPrivileged: boolean

  constructor({
    handler,
    isPrivileged = false,
  }: {
    handler: BotCommandHandler
    isPrivileged: boolean
  }) {
    this.#handler = handler
    this.#isPrivileged = isPrivileged
  }

  get lastExecutionTimeOnTwitch(): number {
    return this.#lastExecutionTimeOnTwitch
  }

  set lastExecutionTimeOnTwitch(value: number) {
    this.#lastExecutionTimeOnTwitch = value
  }

  get isPrivileged(): boolean {
    return this.#isPrivileged
  }

  execute(params: string[], context: BotCommandContext): void | Promise<void> {
    return this.#handler(params, context)
  }
}
