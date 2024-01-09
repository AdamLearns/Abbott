import dotenvFlow from "dotenv-flow"

import { init as initDiscord } from "./discord/init.js"
import { init as initTwitch } from "./twitch/init.js"
dotenvFlow.config()

async function main() {
  await initTwitch()
  await initDiscord()
}

main()
  .then(() => {
    console.log("Started successfully!")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
