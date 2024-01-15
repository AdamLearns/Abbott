import http, { type IncomingMessage, type ServerResponse } from "node:http"
import url from "node:url"

import { type AccessToken, getTokenInfo } from "@twurple/auth"
import dotenvFlow from "dotenv-flow"
import fetch from "node-fetch"

import { BotDatabase } from "./database/BotDatabase.js"

dotenvFlow.config()

const redirectProtocol = "http"
const redirectHost = "localhost"
const redirectPort = 3000
const redirectUri = `${redirectProtocol}://${redirectHost}:${redirectPort}`
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET

// This is what the Twitch API returns
interface RawAccessToken {
  access_token: string
  expires_in: number
  refresh_token: string
  scope: string[]
  token_type: string
}

function isRawAccessToken(token: RawAccessToken): token is RawAccessToken {
  return (
    "access_token" in token && "refresh_token" in token && "expires_in" in token
  )
}

function convertAccessToken({
  access_token,
  expires_in,
  refresh_token,
  scope,
}: RawAccessToken): AccessToken {
  return {
    accessToken: access_token,
    refreshToken: refresh_token,
    scope,
    expiresIn: expires_in,
    obtainmentTimestamp: Date.now(),
  }
}

function startServer() {
  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const reqUrl = url.parse(req.url ?? "/", true)

      if (reqUrl.pathname === "/" && req.method === "GET") {
        const code = reqUrl.query.code

        if (code !== undefined && typeof code === "string") {
          const tokenUrl =
            `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}` +
            `&client_secret=${CLIENT_SECRET}` +
            `&code=${code}` +
            `&grant_type=authorization_code` +
            `&redirect_uri=${redirectUri}`

          const response = await fetch(tokenUrl, {
            method: "POST",
          })
          const rawAccessToken = (await response.json()) as RawAccessToken
          if (!isRawAccessToken(rawAccessToken)) {
            throw new Error("Invalid access token received")
          }
          await saveToDatabase(convertAccessToken(rawAccessToken))
        }

        res.end("Done!")

        process.exit(0)
      } else {
        res.end(
          "This is not a valid URL. This server is just listening for OAuth codes.",
        )
        console.error(`Got an unexpected request: ${req.method} ${req.url}`)
      }
    },
  )

  server.listen(redirectPort, "0.0.0.0", () => {
    console.log(`Server running at ${redirectUri}`)
  })
}

function main() {
  if (CLIENT_ID === undefined || CLIENT_SECRET === undefined) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  startServer()

  const authUrl =
    `https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=chat:read+chat:edit`

  console.log("Go to this URL and log in on the bot account:", authUrl)
}

async function saveToDatabase(accessToken: AccessToken) {
  const tokenInfo = await getTokenInfo(accessToken.accessToken, CLIENT_ID)
  const userId = tokenInfo.userId
  const userName = tokenInfo.userName
  if (userId === null || userName === null) {
    throw new Error(
      "Invalid token info received (doesn't contain both name and ID)",
    )
  }

  const botDatabase = new BotDatabase()
  await botDatabase.saveTwitchToken(accessToken, userId, userName, true)

  console.log(
    `Saved token for ${userId} (${userName}) to database. You should be able to start the bot.`,
  )
}

main()
