import { serve } from "@hono/node-server"
import dotenvFlow from "dotenv-flow"
import { Hono, type Context } from "hono"
import type { BlankInput, Env } from "hono/types"

import type { Bot } from "../twitch/Bot.js"

dotenvFlow.config()

const serverPassword = process.env.SERVER_PASSWORD
const serverPort = process.env.SERVER_PORT

interface FuzzyCommandRequestBody {
  query: string
  password: string
}

async function handleRunFuzzyCommand(
  bot: Bot,
  c: Context<Env, "/run-fuzzy-command", BlankInput>,
) {
  const { password, query } = await c.req.json<FuzzyCommandRequestBody>()

  if (password !== serverPassword) {
    return c.text("Invalid password.", 403)
  }

  await bot.emitFuzzyCommand(query)

  return c.text("Successfully emitted a command.")
}

// This is a web server that listens for requests that the bot itself should
// handle (i.e. ones that the website itself can't handle with just a database)
function startServer(bot: Bot) {
  const app = new Hono()

  app.post("/run-fuzzy-command", (c) => handleRunFuzzyCommand(bot, c))

  const port = Number.parseInt(serverPort as string, 10)
  console.log(`Server is running on port ${port}`)

  serve({
    fetch: app.fetch,
    hostname: "0.0.0.0",
    port,
  })
}

export function init(bot: Bot) {
  if (serverPassword === undefined || serverPort === undefined) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  startServer(bot)
}
