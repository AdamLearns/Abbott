import dotenvFlow from "dotenv-flow"

import { init } from "./discord/init"
dotenvFlow.config()

async function main() {
  await init()
}

await main()
