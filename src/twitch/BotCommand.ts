import type { BotCommandContext } from "./BotCommandContext"

export type BotCommandHandler = (
  params: string[],
  context: BotCommandContext,
) => void | Promise<void>

export class BotCommand {
  #lastExecutionTimeOnTwitch = 0
  #handler: BotCommandHandler
  #isPrivileged: boolean
  #canBeDeleted: boolean

  constructor({
    handler,
    isPrivileged = false,
    canBeDeleted = true,
  }: {
    handler: BotCommandHandler
    isPrivileged: boolean
    canBeDeleted: boolean
  }) {
    this.#handler = handler
    this.#isPrivileged = isPrivileged
    this.#canBeDeleted = canBeDeleted
  }

  set handler(value: BotCommandHandler) {
    this.#handler = value
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

  get canBeDeleted(): boolean {
    return this.#canBeDeleted
  }

  execute(params: string[], context: BotCommandContext): void | Promise<void> {
    return this.#handler(params, context)
  }
}
