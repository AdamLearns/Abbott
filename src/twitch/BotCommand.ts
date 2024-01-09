import type { UUID } from "uuidv7"

import type { BotCommandContext } from "./BotCommandContext.js"

export type BotCommandHandler = (
  params: string[],
  context: BotCommandContext,
) => void | Promise<void>

export class BotCommand {
  #id: UUID
  #lastExecutionTimeOnTwitch = 0
  #handler: BotCommandHandler
  #isPrivileged: boolean
  #canBeDeleted: boolean

  // If this is true, then the only meaningful thing that the command
  // does is output text. This is as opposed to a command that may
  // download a video, change lights, etc.
  #isTextCommand: boolean

  constructor({
    handler,
    id,
    isPrivileged = false,
    canBeDeleted = true,
    isTextCommand = true,
  }: {
    handler: BotCommandHandler
    id: UUID
    isPrivileged?: boolean
    canBeDeleted?: boolean
    isTextCommand?: boolean
  }) {
    this.#handler = handler
    this.#id = id
    this.#isPrivileged = isPrivileged
    this.#canBeDeleted = canBeDeleted
    this.#isTextCommand = isTextCommand
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

  get isTextCommand(): boolean {
    return this.#isTextCommand
  }

  get id(): UUID {
    return this.#id
  }

  execute(params: string[], context: BotCommandContext): void | Promise<void> {
    return this.#handler(params, context)
  }
}
