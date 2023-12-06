import dotenvFlow from "dotenv-flow"
import { init } from "./discord/init"
dotenvFlow.config()

function main() {
  init()
}

main()
