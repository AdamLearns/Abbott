import { UUID } from "abbott-database"

import { CommandContext } from "./CommandContext.js"
import type { CommandData } from "./CommandData.js"

export type CommandHandler = (
  commandData: CommandData,
  context: CommandContext,
) => void | Promise<void>

export class Command {
  #id: UUID
  #handler: CommandHandler
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
    handler: CommandHandler
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

  set handler(value: CommandHandler) {
    this.#handler = value
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

  execute(
    commandData: CommandData,
    context: CommandContext,
  ): void | Promise<void> {
    return this.#handler(commandData, context)
  }
}
