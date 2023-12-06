import dotenvFlow from "dotenv-flow"

import { init as initTwitch } from "./twitch/init"
dotenvFlow.config()

async function main() {
  await initTwitch()
}

await main()
