import { BotDatabase } from "abbott-database"
import dotenvFlow from "dotenv-flow"
import {
  makeOAuth2Client,
  scopes,
  type OAuth2Client,
  getLivestreamVideoLiveChatId,
  readChatMessages,
  type YouTubeMessage,
  type LiveChatMessageListResponse,
} from "youtube-api"

import { StreamNoLongerLiveError } from "../../../youtube-api/src/StreamNoLongerLiveError.js"
import { emitter } from "../events/emitter.js"

dotenvFlow.config()

enum LivestreamStatus {
  UNKNOWN,
  OFFLINE,
  LIVE,
}

let oauth2Client: OAuth2Client

/**
 * This is a string that looks like this: "UC6fWshBRcmOrkaLAFU_ULbQ"
 */
let youTubeChannelId: string | null
let livestreamStatus: LivestreamStatus = LivestreamStatus.UNKNOWN

/**
 * This is a string that looks like this:
 * "KicKGFVDNmZXc2hCUmNtT3JrYUxBRlVfVUxiURILVm53VnpaR2o5aGc"
 */
let liveChatId: string | undefined
let chatPollTimer: NodeJS.Timeout | undefined

/**
 * This is used when fetching YouTube chat messages. It will only return new
 * ones since the last token.
 */
let nextPageToken: string | undefined

/**
 * The number of milliseconds that we MUST wait before polling for chat
 * messages. This is because the quota is quite restrictive at 10k requests per
 * day, so 1 request per second would use it all up in 2.7 hours, and I stream
 * for ~6 hours per day right now.
 */
const MIN_CHAT_POLLING_TIME = 4000

export async function init() {
  const REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI
  const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
  const CLIENT_SECRET = process.env.YOUTUBE_SECRET

  if (
    CLIENT_ID === undefined ||
    CLIENT_SECRET === undefined ||
    REDIRECT_URI === undefined
  ) {
    throw new Error(
      "Missing environment variables. Make sure to copy .env.example to .env and fill out the values.",
    )
  }

  const botDatabase = new BotDatabase()
  youTubeChannelId = await botDatabase.getPrimaryBotYouTubeId()
  if (youTubeChannelId === null) {
    throw new Error("No YouTube ID found in the database")
  }

  const tokenWithName = await botDatabase.getYouTubeTokens(youTubeChannelId)
  const channelTitle = tokenWithName.name

  oauth2Client = makeOAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

  oauth2Client.setCredentials({
    access_token: tokenWithName.accessToken,
    refresh_token: tokenWithName.refreshToken,
    expiry_date: tokenWithName.expiresAt,
    token_type: "Bearer",
    scope: scopes.join(" "),
  })

  oauth2Client.on("tokens", async (tokens) => {
    let refreshToken = tokens.refresh_token
    if (!refreshToken) {
      // Fetch it from the database. I'm assuming the API returns no refresh
      // token if it hasn't changed.
      const tokenWithName = await botDatabase.getYouTubeTokens(
        youTubeChannelId as string,
      )
      refreshToken = tokenWithName.refreshToken
    }
    await botDatabase.saveYouTubeTokens(
      tokens.access_token as string,
      refreshToken,
      tokens.expiry_date as number,
      youTubeChannelId as string,
      channelTitle,
    )
  })

  emitter.onYouTubeStreamLive(youTubeStreamWentLive)
  emitter.onYouTubeStreamOffline(youTubeStreamWentOffline)
  emitter.onYouTubeMessagesReceived(receivedYouTubeMessages)

  await checkIfLive()

  if (livestreamStatus === LivestreamStatus.LIVE) {
    console.log("🔴 The stream is live on YouTube!")
  } else {
    console.log("The YouTube stream is offline.")
  }
}

function receivedYouTubeMessages(messages: YouTubeMessage[]) {
  // TODO: check for a command here and then delete the log calls that I have
  console.log("---------------------------------------")
  console.log(messages)
}

function clearChatPollTimer() {
  if (chatPollTimer !== undefined) {
    clearTimeout(chatPollTimer)
    chatPollTimer = undefined
  }
}

function youTubeStreamWentLive() {
  livestreamStatus = LivestreamStatus.LIVE
  scheduleNextChatPoll(0)
}

function youTubeStreamWentOffline() {
  livestreamStatus = LivestreamStatus.OFFLINE
  clearChatPollTimer()
}

function scheduleNextChatPoll(numMsFromNow: number) {
  // Ensure that there's only ever one call to pollForChatMessages.
  clearChatPollTimer()
  chatPollTimer = setTimeout(pollForChatMessages, numMsFromNow)
}

function processChatMessages(messages: LiveChatMessageListResponse) {
  if (messages.items === undefined) {
    return
  }

  const youTubeMessages: YouTubeMessage[] = []
  for (const message of messages.items) {
    if (message.snippet?.type === "chatEndedEvent") {
      emitter.sendYouTubeStreamOffline()
      return
    }

    if (message.snippet?.type === "textMessageEvent") {
      const authorDetails = message.authorDetails
      if (authorDetails === undefined) {
        continue
      }
      youTubeMessages.push({
        messageText: message.snippet.textMessageDetails?.messageText as string,
        authorId: authorDetails.channelId as string,
        authorDisplayName: authorDetails.displayName as string,
        isPrivileged:
          (authorDetails.isChatOwner ?? false) ||
          (authorDetails.isChatModerator ?? false),
      })
    }
  }

  emitter.sendYouTubeMessagesReceived(youTubeMessages)
}

async function pollForChatMessages() {
  // No matter what, schedule another call to this function. It's possible that
  // we detect that the stream went offline, in which case this call will be
  // canceled. It's also possible that we decide to poll LATER than this amount
  // of time, in which case the call will be adjusted.
  scheduleNextChatPoll(MIN_CHAT_POLLING_TIME)
  try {
    const messages = await readChatMessages(
      oauth2Client,
      liveChatId as string,
      nextPageToken,
    )
    processChatMessages(messages)

    nextPageToken = messages.nextPageToken ?? undefined
    const msToWait = Math.max(
      MIN_CHAT_POLLING_TIME,
      messages.pollingIntervalMillis ?? 1000,
    )
    scheduleNextChatPoll(msToWait)
  } catch (error) {
    if (error instanceof StreamNoLongerLiveError) {
      emitter.sendYouTubeStreamOffline()
      return
    }
  }
}

async function checkIfLive() {
  setTimeout(async () => {
    await checkIfLive()
  }, 60_000)

  if (livestreamStatus === LivestreamStatus.LIVE) {
    // We don't check if we're STILL online here; we do so by fetching chat
    // messages
    return
  }

  liveChatId = await getLivestreamVideoLiveChatId(oauth2Client)
  if (liveChatId === undefined) {
    livestreamStatus = LivestreamStatus.OFFLINE
  } else {
    emitter.sendYouTubeStreamLive()
  }
}