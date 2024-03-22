import { Common } from "googleapis"

export class StreamNoLongerLiveError extends Error {
  constructor() {
    super("Stream is no longer live.")
  }

  static isStreamNoLongerLiveError(
    error: unknown,
  ): error is StreamNoLongerLiveError {
    if (error instanceof Common.GaxiosError) {
      const { message } = error
      if (
        // When the stream goes offline (happens 5 minutes after the end of the
        // broadcast)
        message.includes("The live chat is no longer live") ||
        // When the stream is deleted forever from the YouTube dashboard
        message.includes("Live chat is not enabled for the specified broadcast")
      ) {
        return true
      }
    }
    return false
  }
}
