import { init as initDiscord } from "../discord/init.js"
import { init as initTwitch } from "../twitch/init.js"

export async function startBots() {
  await initTwitch()
  await initDiscord()
}
