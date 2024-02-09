import { RefreshingAuthProvider } from "@twurple/auth"

import { init as initServer } from "../server/init.js"
import { onProcessClose } from "../setup/termination-handler.js"

import { Bot } from "./Bot.js"

function createAuthProvider(): RefreshingAuthProvider {
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

  return authProvider
}

async function createBot(): Promise<Bot> {
  const authProvider = createAuthProvider()
  const twitchChannelName = process.env.TWITCH_CHANNEL_NAME

  if (twitchChannelName === undefined) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  const bot = new Bot({
    twitchChannelName,
    authProvider,
  })

  await bot.init()

  console.info(
    "Successfully created the Twitch bot in channel:",
    twitchChannelName,
  )

  onProcessClose(() => {
    bot.destroy()
  })

  return bot
}

export async function init() {
  const bot = await createBot()
  initServer(bot)
}
