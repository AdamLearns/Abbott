import http, { type IncomingMessage, type ServerResponse } from "node:http"
import url from "node:url"

import { Auth } from "googleapis"

import { scopes, type OAuth2Client } from "./api.js"

type ReceivedTokensCallback = (tokens: Auth.Credentials) => void

export function getTokens(
  oauth2Client: OAuth2Client,
  redirectUri: string,
  callback: ReceivedTokensCallback,
) {
  const authUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: "offline",
    scope: scopes,
  })

  console.log(
    "Go to this URL and log in on the bot account (you may want to use an incognito window so that you don't use the wrong identity):",
    authUrl,
  )

  const redirectUrl = new URL(redirectUri)

  const server = http.createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const reqUrl = url.parse(req.url ?? "/", true)

      if (reqUrl.pathname === redirectUrl.pathname && req.method === "GET") {
        const code = reqUrl.query.code

        if (code !== undefined && typeof code === "string") {
          const { tokens } = await oauth2Client.getToken(code)
          oauth2Client.setCredentials(tokens)
          callback(tokens)
        }

        res.end("Done!")
      } else {
        res.end(
          "This is not a valid URL. This server is just listening for OAuth codes.",
        )
        console.error(`Got an unexpected request: ${req.method} ${req.url}`)
      }
    },
  )

  const portString = redirectUrl.port
  if (portString.length === 0) {
    throw new Error("Invalid redirect URI - cannot find port within it")
  }

  const portNumber = Number.parseInt(portString, 10)

  server.listen(portNumber, "0.0.0.0", () => {
    console.log(`Server running at ${redirectUri}`)
  })
}
