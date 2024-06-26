/* eslint-disable @typescript-eslint/no-empty-function */
import { Listener } from "@d-fischer/typed-event-emitter"
import { ApiClient } from "@twurple/api"
import { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient, type ChatMessage } from "@twurple/chat"
import { BotFakeStorageLayer } from "abbott-database"
import type { BotStorageLayer } from "abbott-database"
import {
  type TestAPI,
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
  assert,
} from "vitest"

import { CommandContext } from "../commands/CommandContext.js"
import { InMemoryCommands } from "../commands/InMemoryCommands.js"
import { Bot } from "../twitch/Bot.js"
import type { CommandData } from "../commands/CommandData.js"

let bot: Bot
let storageLayer: BotStorageLayer

beforeEach(async () => {
  bot = await createBot()
})

interface ContextAndReplySpy {
  context: CommandContext
  replySpy: MockInstance<[text: string], Promise<void>>
}

export const testWithReplySpy: TestAPI<{
  contextAndReplySpy: ContextAndReplySpy
}> = test.extend<{
  contextAndReplySpy: ContextAndReplySpy
}>({
  // Can't use an underscore here or you get a runtime error in the test.
  // eslint-disable-next-line no-empty-pattern
  contextAndReplySpy: async ({}, use) => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await use({ context, replySpy })
  },
})

async function createBot() {
  const authProvider = new RefreshingAuthProvider({
    clientId: "clientId",
    clientSecret: "clientSecret",
  })
  storageLayer = new BotFakeStorageLayer()

  const inMemoryCommands = new InMemoryCommands(storageLayer)
  await inMemoryCommands.init()
  const bot = new Bot({
    twitchChannelName: "!madeup@",
    authProvider,
    storageLayer,
    commands: inMemoryCommands,
    makeApiClient: () => {
      return new ApiClient({ authProvider })
    },
    makeChatClient: () => {
      return new ChatClient({ authProvider })
    },
  })
  await bot.init()
  return bot
}

vi.mock("@twurple/auth", () => {
  const RefreshingAuthProvider = vi.fn(() => ({
    addUser: vi.fn(),
    onRefresh: vi.fn(),
  }))
  return { RefreshingAuthProvider }
})

vi.mock("@twurple/api", () => {
  const ApiClient = vi.fn(() => ({
    users: {
      getUserByName: vi.fn(() => ({
        id: "fake",
      })),
    },
  }))
  return { ApiClient }
})

vi.mock("@twurple/chat", async () => {
  const actual = await vi.importActual("@twurple/chat")
  return {
    ...actual,
    ChatClient: vi.fn(() => ({
      say: vi.fn(),
      onMessage: vi.fn(),
      connect: vi.fn(),
    })),
  }
})

function createMockContext(): CommandContext {
  return new CommandContext(bot, {} as ChatMessage)
}

// Make a CommandData out of params where the name doesn't matter
function makeCommandData(params: string[]): CommandData {
  return {
    name: "command",
    params,
  }
}

describe("Edit-command tests", () => {
  testWithReplySpy(
    "editing a command with no parameters returns a usage message",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userEditCommand(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "editing a command that doesn't exist returns an error",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userEditCommand(
        makeCommandData(["madeupcommand", "new", "response"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("doesn't exist")
    },
  )

  testWithReplySpy(
    "can't edit a non-text command",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.addCommand({
        name: "nontextcommand",
        handler: () => {},
      })

      await bot.commands.userEditCommand(
        makeCommandData(["nontextcommand", "new", "response"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("not a text command")
    },
  )

  testWithReplySpy(
    "built-in commands are not editable",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      const builtInCommandNames = [
        "addcom",
        "delcom",
        "editcom",
        "aliascom",
        "unaliascom",
      ]
      let numCalls = 0
      for (const commandName of builtInCommandNames) {
        await bot.commands.userEditCommand(
          makeCommandData([commandName, "new", "response"]),
          context,
        )
        numCalls++
        expect(replySpy).toHaveBeenCalledTimes(numCalls)
        expect(replySpy.mock.lastCall?.[0]).toContain("not a text command")
      }
    },
  )

  testWithReplySpy(
    "can successfully edit a text command",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.addCommand({
        name: "testcommand",
        textResponse: "Hello world",
      })

      await bot.commands.userEditCommand(
        makeCommandData(["testcommand", "new", "response"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("successfully edited")
    },
  )
})

describe("Unalias-command tests", () => {
  testWithReplySpy(
    "unaliasing a command with no parameters returns a usage message",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userUnaliasCommand(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "cannot unalias a command that doesn't exist",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userUnaliasCommand(
        makeCommandData(["madeupcommand"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("There is no command")
    },
  )

  testWithReplySpy(
    "cannot use unalias to delete a command",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.addCommand({
        name: "testcommand",
        textResponse: "Hello world",
      })
      await bot.commands.userUnaliasCommand(
        makeCommandData(["testcommand"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(
        "You cannot use this command to delete a command",
      )
    },
  )

  test("can successfully unalias a command", async () => {
    const context = createMockContext()
    vi.spyOn(context, "reply").mockImplementation(async () => {})

    await bot.commands.addCommand({
      name: "testcommand",
      textResponse: "Hello world",
    })
    await bot.commands.addAlias("testcommandalias", "testcommand")
    expect(bot.commands.getAllNamesOfCommand("testcommandalias")).toHaveLength(
      2,
    )
    expect(
      bot.commands.getAllNamesOfCommand("testcommandalias").sort(),
    ).toEqual(["testcommand", "testcommandalias"].sort())
    await bot.commands.userUnaliasCommand(
      makeCommandData(["testcommand"]),
      context,
    )
    expect(bot.commands.getAllNamesOfCommand("testcommandalias")).toHaveLength(
      1,
    )
  })
})

describe("Alias-command tests", () => {
  testWithReplySpy(
    "aliasing a command with no parameters returns a usage message",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAliasCommand(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "cannot make an alias if there's already a command with that name",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAliasCommand(
        makeCommandData(["addcom", "delcom"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Alias is already defined")
    },
  )

  testWithReplySpy(
    "cannot make an alias to a command that doesn't exist",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAliasCommand(
        makeCommandData(["newalias", "madeupcommand"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(
        "There is no command by that name",
      )
    },
  )

  test("can successfully alias a command", async () => {
    const context = createMockContext()
    vi.spyOn(context, "reply").mockImplementation(async () => {})

    expect(bot.commands.getAllNamesOfCommand("addcom")).toHaveLength(2)
    await bot.commands.userAliasCommand(
      makeCommandData(["addacommand", "addcom"]),
      context,
    )
    expect(bot.commands.getAllNamesOfCommand("addcom")).toHaveLength(3)
  })
})

describe("Add-command tests", () => {
  testWithReplySpy(
    "adding a command with no parameters returns a usage message",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAddCommand(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "cannot add a command through chat that already exists",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAddCommand(
        makeCommandData(["delcom", "Deletes", "a", "command"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("already exists")
    },
  )

  test("cannot add a command through the API that already exists", async () => {
    const context = createMockContext()
    vi.spyOn(context, "reply").mockImplementation(async () => {})

    await expect(async () => {
      await bot.commands.addCommand({ name: "delcom", handler: () => {} })
    }).rejects.toThrowError("already")
  })

  test("can add a command", async () => {
    const context = createMockContext()
    context.reply = vi.fn().mockImplementation(async () => {})

    expect(bot.commands.getAllNamesOfCommand("fruit")).toHaveLength(0)
    await bot.commands.userAddCommand(
      makeCommandData(["fruit", "Tasty", "apple"]),
      context,
    )
    expect(bot.commands.getAllNamesOfCommand("fruit")).toHaveLength(1)
  })
})

describe("Delete-command tests", () => {
  testWithReplySpy(
    "delete returns usage message with no parameters",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userDeleteCommand(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "cannot delete nonexistent command",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userDeleteCommand(
        makeCommandData(["commandthatdoesnotexist"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("doesn't exist")
    },
  )

  testWithReplySpy(
    "cannot delete built-in command",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userDeleteCommand(makeCommandData(["addcom"]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(
        "is marked such that it cannot be deleted",
      )
    },
  )

  test("can delete a regular command", async () => {
    const context = createMockContext()
    context.reply = vi.fn().mockImplementation(async () => {})

    await bot.commands.addCommand({ name: "aaa", textResponse: "bbb" })
    expect(bot.commands.getAllNamesOfCommand("aaa")).toHaveLength(1)
    await bot.commands.userDeleteCommand(makeCommandData(["aaa"]), context)
    expect(bot.commands.getAllNamesOfCommand("aaa")).toHaveLength(0)
  })

  test("deleting a command deletes all of its names", async () => {
    const context = createMockContext()
    context.reply = vi.fn().mockImplementation(async () => {})

    await bot.commands.addCommand({ name: "food", textResponse: "Apple" })
    await bot.commands.addAlias("fruit", "food")
    await bot.commands.addAlias("redstuff", "fruit")
    expect(bot.commands.getAllNamesOfCommand("food")).toHaveLength(3)
    expect(bot.commands.getAllNamesOfCommand("fruit")).toHaveLength(3)
    await bot.commands.userDeleteCommand(makeCommandData(["food"]), context)
    expect(bot.commands.getAllNamesOfCommand("food")).toHaveLength(0)
  })

  test("non-mod user cannot delete commands", async () => {
    const authProvider = new RefreshingAuthProvider({
      clientId: "clientId",
      clientSecret: "clientSecret",
    })

    // The first parameter to onMessage is the listener
    let fn: Parameters<ChatClient["onMessage"]>[0] | undefined

    const mockChatClient = new ChatClient({ authProvider })
    const saySpy = vi.spyOn(mockChatClient, "say")

    vi.spyOn(mockChatClient, "onMessage").mockImplementation((fnToCall) => {
      fn = fnToCall
      // Return a fake listener as expected by the implementation.
      return new Listener(mockChatClient, vi.fn(), vi.fn())
    })

    const inMemoryCommands = new InMemoryCommands(storageLayer)
    await inMemoryCommands.init()
    const bot = new Bot({
      twitchChannelName: "!madeup@",
      authProvider,
      storageLayer: new BotFakeStorageLayer(),
      commands: inMemoryCommands,
      makeApiClient: () => {
        return new ApiClient({ authProvider })
      },
      makeChatClient: () => {
        return mockChatClient
      },
    })

    await bot.init()

    const commandName = "today"
    const response = "Today is a good day"
    await bot.commands.addCommand({ name: commandName, textResponse: response })

    assert(fn)

    // I'm disabling the linter here because I couldn't figure out the right
    // types of the fn to save and then call asynchronously later.
    //
    // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
    await fn("channel", "user", "!delcom today", {
      userInfo: { isMod: false, isBroadcaster: false },
    } as ChatMessage)
    expect(saySpy).toHaveBeenCalledOnce()
    expect(saySpy.mock.lastCall?.[1]).toContain("You don't have permission")

    // Iterate over all mock calls and ensure that we didn't actually delete the command
    for (const mockCall of saySpy.mock.calls) {
      expect(mockCall[1]).not.toContain("success")
    }

    // Make sure the command still works (because we didn't have permission to delete it)
    // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
    await fn("channel", "user", `!${commandName}`, {
      userInfo: { isMod: false, isBroadcaster: false },
    } as ChatMessage)
    let foundCommand = false
    for (const mockCall of saySpy.mock.calls) {
      if (mockCall[1].includes(response)) {
        foundCommand = true
      }
    }
    expect(foundCommand).toBe(true)
  })
})

describe("Quote tests", () => {
  testWithReplySpy(
    "adding a quote with no arguments returns a usage message",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAddQuote(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "can add a quote",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userAddQuote(
        makeCommandData(["Author", "Quote"]),
        context,
      )

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("successfully added")
    },
  )

  testWithReplySpy(
    "deleting a quote with no arguments returns a usage message",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userDelQuote(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Usage")
    },
  )

  testWithReplySpy(
    "cannot delete a quote with an invalid ID",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userDelQuote(makeCommandData(["zebra"]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("not a valid quote ID")
    },
  )

  testWithReplySpy(
    "cannot delete a quote that doesn't exist",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      const id = 1
      await bot.commands.userDelQuote(makeCommandData([`${id}`]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(
        `Quote #${id} didn't exist!`,
      )
    },
  )

  testWithReplySpy(
    "can delete a quote",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      const deleteQuoteSpy = vi
        .spyOn(storageLayer, "deleteQuote")
        .mockImplementation((id: number) => {
          return Promise.resolve({
            quote: "deleted",
            author: "deleted",
            quoted_at: new Date(),
            id,
          })
        })

      // The ID just needs to be a number since we mocked the implementation
      const id = 1
      await bot.commands.userDelQuote(makeCommandData([`${id}`]), context)

      expect(deleteQuoteSpy).toHaveBeenCalledOnce()
      expect(deleteQuoteSpy.mock.lastCall?.[0]).toBe(id)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("Deleted quote")
    },
  )

  testWithReplySpy(
    "cannot get a quote with an invalid ID",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userGetQuote(makeCommandData(["zebra"]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain("not a valid quote ID")
    },
  )

  testWithReplySpy(
    "cannot get a random quote if none exist",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      await bot.commands.userGetQuote(makeCommandData([]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(
        "There are no quotes in the database",
      )
    },
  )

  testWithReplySpy(
    "cannot get quote by ID if it doesn't exist",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      const id = 1

      await bot.commands.userGetQuote(makeCommandData([`${id}`]), context)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(`There is no quote #${id}`)
    },
  )

  testWithReplySpy(
    "can get a specific quote",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      const quote = "There is no spoon"
      const getQuoteSpy = vi
        .spyOn(storageLayer, "getQuote")
        .mockImplementation((id: number) => {
          return Promise.resolve({
            quote,
            author: "author",
            quoted_at: new Date(),
            id,
          })
        })

      const id = 1
      await bot.commands.userGetQuote(makeCommandData([`${id}`]), context)

      expect(getQuoteSpy).toHaveBeenCalledOnce()
      expect(getQuoteSpy.mock.lastCall?.[0]).toBe(id)

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(quote)
    },
  )

  testWithReplySpy(
    "can get a random quote",
    async ({ contextAndReplySpy: { context, replySpy } }) => {
      const quote = "There is no spoon"
      const getRandomQuoteSpy = vi
        .spyOn(storageLayer, "getRandomQuote")
        .mockImplementation(() => {
          return Promise.resolve({
            quote,
            author: "author",
            quoted_at: new Date(),
            id: 1,
          })
        })

      await bot.commands.userGetQuote(makeCommandData([]), context)

      expect(getRandomQuoteSpy).toHaveBeenCalledOnce()

      expect(replySpy).toHaveBeenCalledOnce()
      expect(replySpy.mock.lastCall?.[0]).toContain(quote)
    },
  )
})
