/* eslint-disable @typescript-eslint/no-empty-function */
import { ApiClient } from "@twurple/api"
import { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient } from "@twurple/chat"
import { beforeEach, describe, expect, test, vi } from "vitest"

import { Bot } from "../twitch/Bot"
import { BotCommandContext } from "../twitch/BotCommandContext"
import type { ChatMessage } from "../twitch/ChatMessage"

let bot: Bot

beforeEach(async () => {
  bot = await createBot()
})

async function createBot() {
  const authProvider = new RefreshingAuthProvider({
    clientId: "clientId",
    clientSecret: "clientSecret",
  })
  const bot = new Bot({
    authProvider,
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
  const RefreshingAuthProvider = vi.fn()
  return { RefreshingAuthProvider }
})

vi.mock("@twurple/api", () => {
  const ApiClient = vi.fn()
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

function createMockContext(): BotCommandContext {
  return new BotCommandContext(bot, {} as ChatMessage)
}

describe("Edit tests", () => {
  test("editing a command with no parameters returns a usage message", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userEditCommand([], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("Usage")
  })

  test("editing a command that doesn't exist returns an error", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userEditCommand(["madeupcommand", "new", "response"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("doesn't exist")
  })

  test("can't edit a non-text command", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.addCommand({
      name: "nontextcommand",
      handler: () => {},
    })

    await bot.userEditCommand(["nontextcommand", "new", "response"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "not a text command",
    )
  })

  test("built-in commands are not editable", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    const builtInCommandNames = [
      "addcom",
      "delcom",
      "editcom",
      "aliascom",
      "unaliascom",
    ]
    let numCalls = 0
    for (const commandName of builtInCommandNames) {
      await bot.userEditCommand([commandName, "new", "response"], context)
      numCalls++
      expect(replySpy).toHaveBeenCalledTimes(numCalls)
      expect((replySpy.mock.lastCall as string[])[0]).toContain(
        "not a text command",
      )
    }
  })

  test("can successfully edit a text command", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.addCommand({ name: "testcommand", textResponse: "Hello world" })

    await bot.userEditCommand(["testcommand", "new", "response"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "successfully edited",
    )
  })
})

describe("Unalias tests", () => {
  test("unaliasing a command with no parameters returns a usage message", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userUnaliasCommand([], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("Usage")
  })

  test("cannot unalias a command that doesn't exist", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userUnaliasCommand(["madeupcommand"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "There is no command",
    )
  })

  test("cannot use unalias to delete a command", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.addCommand({ name: "testcommand", textResponse: "Hello world" })
    await bot.userUnaliasCommand(["testcommand"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "You cannot use this command to delete a command",
    )
  })

  test("can successfully unalias a command", async () => {
    const context = createMockContext()
    vi.spyOn(context, "reply").mockImplementation(async () => {})

    await bot.addCommand({ name: "testcommand", textResponse: "Hello world" })
    await bot.addAlias("testcommandalias", "testcommand")
    expect(bot.getAllNamesOfCommand("testcommandalias")).toHaveLength(2)
    expect(bot.getAllNamesOfCommand("testcommandalias").sort()).toEqual(
      ["testcommand", "testcommandalias"].sort(),
    )
    await bot.userUnaliasCommand(["testcommand"], context)
    expect(bot.getAllNamesOfCommand("testcommandalias")).toHaveLength(1)
  })
})

describe("Alias tests", () => {
  test("aliasing a command with no parameters returns a usage message", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userAliasCommand([], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("Usage")
  })

  test("cannot make an alias if there's already a command with that name", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userAliasCommand(["addcom", "delcom"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "Alias is already defined",
    )
  })

  test("cannot make an alias to a command that doesn't exist", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userAliasCommand(["newalias", "madeupcommand"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "There is no command by that name",
    )
  })

  test("can successfully alias a command", async () => {
    const context = createMockContext()
    vi.spyOn(context, "reply").mockImplementation(async () => {})

    expect(bot.getAllNamesOfCommand("addcom")).toHaveLength(2)
    await bot.userAliasCommand(["addacommand", "addcom"], context)
    expect(bot.getAllNamesOfCommand("addcom")).toHaveLength(3)
  })
})

describe("Addition tests", () => {
  test("adding a command with no parameters returns a usage message", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userAddCommand([], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("Usage")
  })

  test("cannot add a command through chat that already exists", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userAddCommand(["delcom", "Deletes", "a", "command"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("already exists")
  })

  test("cannot add a command through the API that already exists", () => {
    const context = createMockContext()
    vi.spyOn(context, "reply").mockImplementation(async () => {})

    expect(async () => {
      await bot.addCommand({ name: "delcom", handler: () => {} })
    }).toThrowError("already")
  })

  test("can add a command", async () => {
    const context = createMockContext()
    context.reply = vi.fn().mockImplementation(async () => {})

    expect(bot.getAllNamesOfCommand("fruit")).toHaveLength(0)
    await bot.userAddCommand(["fruit", "Tasty", "apple"], context)
    expect(bot.getAllNamesOfCommand("fruit")).toHaveLength(1)
  })
})

describe("Deletion tests", () => {
  test("delete returns usage message with no parameters", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userDeleteCommand([], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("Usage")
  })

  test("cannot delete nonexistent command", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userDeleteCommand(["commandthatdoesnotexist"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain("doesn't exist")
  })

  test("cannot delete built-in command", async () => {
    const context = createMockContext()
    const replySpy = vi
      .spyOn(context, "reply")
      .mockImplementation(async () => {})

    await bot.userDeleteCommand(["addcom"], context)

    expect(replySpy).toHaveBeenCalledOnce()
    expect((replySpy.mock.lastCall as string[])[0]).toContain(
      "is marked such that it cannot be deleted",
    )
  })

  test("can delete a regular command", async () => {
    const context = createMockContext()
    context.reply = vi.fn().mockImplementation(async () => {})

    await bot.addCommand({ name: "aaa", textResponse: "bbb" })
    expect(bot.getAllNamesOfCommand("aaa")).toHaveLength(1)
    await bot.userDeleteCommand(["aaa"], context)
    expect(bot.getAllNamesOfCommand("aaa")).toHaveLength(0)
  })

  test("deleting a command deletes all of its names", async () => {
    const context = createMockContext()
    context.reply = vi.fn().mockImplementation(async () => {})

    await bot.addCommand({ name: "food", textResponse: "Apple" })
    await bot.addAlias("fruit", "food")
    await bot.addAlias("redstuff", "fruit")
    expect(bot.getAllNamesOfCommand("food")).toHaveLength(3)
    expect(bot.getAllNamesOfCommand("fruit")).toHaveLength(3)
    await bot.userDeleteCommand(["food"], context)
    expect(bot.getAllNamesOfCommand("food")).toHaveLength(0)
  })

  type OnMessageFunction = (
    channel: string,
    user: string,
    text: string,
    msg: ChatMessage,
  ) => void

  test("non-mod user cannot delete commands", () => {
    const authProvider = new RefreshingAuthProvider({
      clientId: "clientId",
      clientSecret: "clientSecret",
    })
    let fn: undefined | OnMessageFunction
    const mockChatClient = new ChatClient({ authProvider })

    const saySpy = vi
      .spyOn(mockChatClient, "say")
      .mockImplementation(async () => {})

    // TODO: I can't figure out how you're SUPPOSED to write this line... 😢
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    vi.spyOn(mockChatClient, "onMessage").mockImplementation(
      (fnToCall: OnMessageFunction) => {
        fn = fnToCall
      },
    )

    new Bot({
      authProvider,
      makeApiClient: () => {
        return new ApiClient({ authProvider })
      },
      makeChatClient: () => {
        return mockChatClient
      },
    })

    if (fn !== undefined) {
      fn("channel", "user", "!delcom today", {
        userInfo: { isMod: false, isBroadcaster: false },
      } as ChatMessage)
    }
    expect(saySpy).toHaveBeenCalledOnce()
    expect((saySpy.mock.lastCall as string[])[1]).toContain(
      "You don't have permission",
    )
  })
})
