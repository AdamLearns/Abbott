import { type BotStorageLayer, type DatabaseTextCommand } from "abbott-database"
import Fuse, { type FuseResult } from "fuse.js"

import type { InMemoryCommands } from "./InMemoryCommands.js"

export abstract class GenericBot {
  constructor(
    public readonly commands: InMemoryCommands,
    public readonly storageLayer: BotStorageLayer,
  ) {}

  abstract say: (text: string) => Promise<void>

  /**
   * Wrapper around "say" specifically for text command responses. This is
   * because YouTube only allows 200 characters in a single message, but text
   * commands all have their own URLs, so when we know we've exceeded 200
   * characters, we can just link to the URL.
   * @param commandName The particular alias that the user typed.
   */
  abstract sayTextCommandResponse: (
    commandName: string,
    text: string,
  ) => Promise<void>
  abstract reply: (
    text: string,
    replyToMessage: GenericMessage,
  ) => Promise<void>

  async emitFuzzyCommand(query: string) {
    const dbCommands = await this.storageLayer.loadTextCommands()
    const fuse = new Fuse(dbCommands, { keys: ["name"] })

    const results = fuse.search(query)
    if (results.length === 0) {
      await this.say(
        `Adam tried getting you to check out a command, but I couldn't find one matching "${query}".`,
      )
    } else {
      const firstResult = results[0] as FuseResult<DatabaseTextCommand>

      const { name, response } = firstResult.item

      await this.say(
        `Adam suggested that you check out the !${name} command. I'll run that for you now. MrDestructoid`,
      )
      await this.sayTextCommandResponse(name, response)
    }
  }
}

// A message on Twitch or YouTube. They don't have much in common, so each
// specific bot will just cast to the message type that it expects to be able to
// use.
export interface GenericMessage {}
