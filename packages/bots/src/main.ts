import dotenvFlow from "dotenv-flow"

import { migrateIfNeeded } from "./setup/back-up-and-migrate.js"
import { startBots } from "./setup/start-bots.js"
import { setUpTerminationHandler } from "./setup/termination-handler.js"

dotenvFlow.config()

async function main() {
  await migrateIfNeeded()
  await startBots()
  setUpTerminationHandler()
}

main()
  .then(() => {
    console.log("Started successfully!")
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
