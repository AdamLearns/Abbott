import { EventEmitter } from "@d-fischer/typed-event-emitter"

// This linter error is intended for Node events, not this custom library.
// eslint-disable-next-line unicorn/prefer-event-target
class AbbottMessageBus extends EventEmitter {
  onStreamOnline = this.registerEvent<[title: string | null]>()

  sendStreamOnline(title: string | null) {
    this.emit(this.onStreamOnline, title)
  }
}

export const emitter = new AbbottMessageBus()
