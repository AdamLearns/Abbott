import { EventEmitter } from "@d-fischer/typed-event-emitter"
import type { YouTubeMessage } from "youtube-api"

// This linter error is intended for Node events, not this custom library.
// eslint-disable-next-line unicorn/prefer-event-target
class AbbottMessageBus extends EventEmitter {
  onTwitchStreamLive = this.registerEvent<[title: string | null]>()
  onYouTubeStreamLive = this.registerEvent<[liveChatId: string]>()
  onYouTubeStreamOffline = this.registerEvent()
  onYouTubeMessagesReceived = this.registerEvent<[messages: YouTubeMessage[]]>()

  sendTwitchStreamLive(title: string | null) {
    this.emit(this.onTwitchStreamLive, title)
  }
  sendYouTubeStreamLive(liveChatId: string) {
    this.emit(this.onYouTubeStreamLive, liveChatId)
  }
  sendYouTubeStreamOffline() {
    this.emit(this.onYouTubeStreamOffline)
  }
  sendYouTubeMessagesReceived(messages: YouTubeMessage[]) {
    this.emit(this.onYouTubeMessagesReceived, messages)
  }
}

export const emitter = new AbbottMessageBus()
