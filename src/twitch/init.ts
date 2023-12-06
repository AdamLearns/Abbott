import fs from "node:fs"

import { type AccessToken, RefreshingAuthProvider } from "@twurple/auth"
import {
  Bot,
  type BotCommand,
  createBotCommand,
  type SubEvent,
  type SubGiftEvent,
} from "@twurple/easy-bot"

import { commandsAndResponses } from "../commands"

async function createAuthProvider(): Promise<RefreshingAuthProvider> {
  const clientId = process.env.CLIENT_ID
  const clientSecret = process.env.CLIENT_SECRET

  if (clientSecret === undefined || clientId === undefined) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  const authProvider: RefreshingAuthProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tokenData: AccessToken = JSON.parse(
    fs.readFileSync("./tokens.102460608.json", "utf8"),
  )

  try {
    await authProvider.addUserForToken(tokenData, ["chat"])
  } catch {
    // DO NOT PRINT THIS ERROR; it has secrets in it!
    throw new Error(
      "Couldn't call addUserForToken. Probably sent a bad refresh token. Follow https://twurple.js.org/docs/examples/chat/basic-bot.html to fix it.",
    )
  }

  authProvider.onRefresh((userId: string, newTokenData: AccessToken) => {
    fs.writeFileSync(
      `./tokens.${userId}.json`,
      JSON.stringify(newTokenData, null, 4),
      { encoding: "utf8" },
    )
  })

  return authProvider
}

function createBot(authProvider: RefreshingAuthProvider): Bot {
  const commands: BotCommand[] = []

  for (const [command, response] of Object.entries(commandsAndResponses)) {
    commands.push(
      createBotCommand(command, async (_params, { say }) => {
        await say(response)
      }),
    )
  }

  const bot = new Bot({
    authProvider,
    channels: ["AdamLearnsLive"],
    commands,
  })

  bot.onSub(async ({ broadcasterName, userName }: SubEvent) => {
    await bot.say(
      broadcasterName,
      `Thanks to @${userName} for subscribing to the channel!`,
    )
  })

  bot.onResub(async ({ broadcasterName, userName, months }: SubEvent) => {
    await bot.say(
      broadcasterName,
      `Thanks to @${userName} for subscribing to the channel for a total of ${months} months!`,
    )
  })

  bot.onSubGift(
    async ({ broadcasterName, gifterName, userName }: SubGiftEvent) => {
      await bot.say(
        broadcasterName,
        `Thanks to @${gifterName} for gifting a subscription to @${userName}!`,
      )
    },
  )

  return bot
}

export async function init() {
  console.info("Starting the Twitch bot")

  const authProvider = await createAuthProvider()
  createBot(authProvider)

  console.info("Successfully created the Twitch bot")
}
