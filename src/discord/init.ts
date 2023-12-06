import { promises as fs } from "node:fs"

import { type AccessToken, RefreshingAuthProvider } from "@twurple/auth"
import {
  Bot,
  type BotCommand,
  createBotCommand,
  type SubEvent,
  type SubGiftEvent,
} from "@twurple/easy-bot"

import { commandsAndResponses } from "../commands"

export async function init() {
  console.info("Starting the Discord bot")
  const clientId = "b7knlmqszef0wdilae5vu3qr8qpw0q"
  const clientSecret = process.env.CLIENT_SECRET

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const tokenData: AccessToken = JSON.parse(
    await fs.readFile("./tokens.102460608.json", "utf8"),
  )

  if (clientSecret === undefined) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  const authProvider: RefreshingAuthProvider = new RefreshingAuthProvider({
    clientId,
    clientSecret,
  })

  authProvider.onRefresh(async (userId: string, newTokenData: AccessToken) => {
    await fs.writeFile(
      `./tokens.${userId}.json`,
      JSON.stringify(newTokenData, null, 4),
      { encoding: "utf8" },
    )
  })

  try {
    await authProvider.addUserForToken(tokenData, ["chat"])
  } catch {
    // DO NOT PRINT THIS ERROR; it has secrets in it!
    throw new Error(
      "Couldn't call addUserForToken. Probably sent a bad refresh token. Follow https://twurple.js.org/docs/examples/chat/basic-bot.html to fix it.",
    )
  }

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
    commands: [
      createBotCommand("dice", async (_params, { reply }) => {
        const diceRoll = Math.floor(Math.random() * 6) + 1
        await reply(`You rolled a ${diceRoll}`)
      }),
      createBotCommand("slap", async (params, { userName, say }) => {
        await say(
          `${userName} slaps ${params.join(
            " ",
          )} around a bit with a large trout`,
        )
      }),
      ...commands,
    ],
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
}
