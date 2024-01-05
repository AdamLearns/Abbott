import dotenvFlow from "dotenv-flow"

import { init as initDiscord } from "./discord/init"
import { init as initTwitch } from "./twitch/init"
dotenvFlow.config()

async function main() {
  await initTwitch()
  await initDiscord()
}

await main()
