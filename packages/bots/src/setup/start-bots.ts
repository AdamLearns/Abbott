import { InMemoryCommands } from "../commands/InMemoryCommands.js"
import { init as initDiscord } from "../discord/init.js"
import { init as initServer } from "../server/init.js"
import { init as initTwitch } from "../twitch/init.js"
import { init as initYouTube } from "../youtube/init.js"

export async function startBots() {
  const commands = new InMemoryCommands()
  await commands.init()
  const twitchBot = await initTwitch(commands)
  const youTubeBot = await initYouTube(commands)
  await initDiscord()

  initServer(twitchBot, youTubeBot)
}
