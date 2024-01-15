import { type AccessToken, RefreshingAuthProvider } from "@twurple/auth"

import { BotDatabase } from "../database/BotDatabase.js"

import { Bot } from "./Bot.js"

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

  const botDatabase = new BotDatabase()
  const token = await botDatabase.getTwitchToken()

  try {
    await authProvider.addUserForToken(token, ["chat"])
  } catch {
    // DO NOT PRINT THIS ERROR; it has secrets in it!
    throw new Error(
      "Couldn't call addUserForToken. Probably sent a bad refresh token. Follow https://twurple.js.org/docs/examples/chat/basic-bot.html to fix it.",
    )
  }

  authProvider.onRefresh(async (_userId: string, newTokenData: AccessToken) => {
    await botDatabase.refreshTwitchToken(newTokenData)
  })

  return authProvider
}

async function createBot(authProvider: RefreshingAuthProvider): Promise<Bot> {
  const twitchChannelName = process.env.TWITCH_CHANNEL_NAME

  if (twitchChannelName === undefined) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  const bot = new Bot({ twitchChannelName, authProvider })

  await bot.init()

  return bot
}

export async function init() {
  console.info("Starting the Twitch bot")

  const authProvider = await createAuthProvider()
  await createBot(authProvider)

  console.info("Successfully created the Twitch bot")
}
