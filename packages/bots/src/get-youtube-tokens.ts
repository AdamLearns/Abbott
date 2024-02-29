import { BotDatabase } from "abbott-database"
import dotenvFlow from "dotenv-flow"
import { getBasicChannelInfo, getTokens, makeOAuth2Client } from "youtube-api"

dotenvFlow.config()

const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_SECRET

function main() {
  if (
    CLIENT_ID === undefined ||
    CLIENT_SECRET === undefined ||
    REDIRECT_URI === undefined
  ) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  const oauth2Client = makeOAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

  getTokens(oauth2Client, REDIRECT_URI, async (tokens) => {
    oauth2Client.setCredentials(tokens)
    const { id, title } = await getBasicChannelInfo(oauth2Client)

    console.log("Received tokens. Saving the tokens to the database")
    const botDatabase = new BotDatabase()
    await botDatabase.saveYouTubeTokens(
      tokens.access_token as string,
      tokens.refresh_token as string,
      tokens.expiry_date as number,
      id,
      title,
    )
    console.log(
      "Successfully saved! You should be able to use the YouTube portion of the bot now.",
    )

    process.exit(0)
  })
}

main()
