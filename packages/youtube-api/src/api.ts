import { Auth, Common, google, youtube_v3 } from "googleapis"

import { StreamNoLongerLiveError } from "./StreamNoLongerLiveError.js"

export type OAuth2Client = Auth.OAuth2Client
export type BasicChannelInfo = { id: string; title: string }
export type LiveChatMessageListResponse =
  youtube_v3.Schema$LiveChatMessageListResponse

export interface YouTubeMessage {
  messageText: string
  authorId: string
  authorDisplayName: string
  isPrivileged: boolean
}

/**
 * The scopes needed by the bot now for all YouTube API calls. Since these are
 * hard-coded here, we don't store them in the database.
 */
export const scopes = [
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
]

export function makeOAuth2Client(
  clientId: string,
  clientSecret: string,
  redirectUri: string,
): OAuth2Client {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

export async function getBasicChannelInfo(
  auth: OAuth2Client,
): Promise<BasicChannelInfo> {
  try {
    const results = await google.youtube("v3").channels.list({
      auth,
      mine: true,
      // See this page for valid parameters:
      // https://developers.google.com/youtube/v3/docs/channels/list
      part: ["id", "snippet"],
    })
    const firstItem = results.data.items?.[0]
    if (firstItem === undefined) {
      throw new Error("Could not find your channel information.")
    }
    const id = firstItem.id
    const title = firstItem.snippet?.title
    if (!id || !title) {
      throw new Error("Could not determine either ID or title")
    }

    return {
      id,
      title,
    }
  } catch (error) {
    console.error("Error fetching channel info", error)
    throw error
  }
}

export async function getLivestreamVideoLiveChatId(
  auth: OAuth2Client,
): Promise<string | undefined> {
  try {
    const results = await google.youtube("v3").liveBroadcasts.list({
      auth,
      broadcastStatus: "active",
      part: ["snippet"],
    })
    return results.data.items?.[0]?.snippet?.liveChatId ?? undefined
  } catch (error) {
    console.error("Error fetching live chat ID", error)
    return undefined
  }
}

export async function readChatMessages(
  auth: OAuth2Client,
  liveChatId: string,
  nextPageToken: string | undefined,
): Promise<LiveChatMessageListResponse> {
  try {
    const params: {
      auth: OAuth2Client
      liveChatId: string
      part: string[]
      pageToken?: string
    } = {
      auth,
      liveChatId,
      part: ["snippet", "authorDetails"],
    }
    if (nextPageToken !== undefined) {
      params.pageToken = nextPageToken
    }
    const results = await google.youtube("v3").liveChatMessages.list(params)
    return results.data
  } catch (error) {
    if (
      error instanceof Common.GaxiosError &&
      error.message.includes("The live chat is no longer live")
    ) {
      throw new StreamNoLongerLiveError()
    }

    console.error("Error fetching chat messages", error)
    throw error
  }
}

export async function sendChatMessage(
  auth: OAuth2Client,
  liveChatId: string,
  messageText: string,
) {
  try {
    await google.youtube("v3").liveChatMessages.insert({
      auth,
      part: ["snippet"],
      requestBody: {
        snippet: {
          liveChatId,
          type: "textMessageEvent",
          textMessageDetails: {
            messageText,
          },
        },
      },
    })
  } catch (error) {
    console.error("Error sending chat message", error)
  }
}
