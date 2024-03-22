import { Common } from "googleapis"

export class QuotaExceededError extends Error {
  constructor() {
    super("YouTube quota has been exceeded.")
  }

  static isQuotaExceededError(error: unknown): error is QuotaExceededError {
    if (error instanceof Common.GaxiosError) {
      const { message } = error
      if (message.includes("exceeded your") && message.includes("quota")) {
        return true
      }
    }
    return false
  }
}
