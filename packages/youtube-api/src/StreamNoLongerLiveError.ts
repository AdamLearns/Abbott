export class StreamNoLongerLiveError extends Error {
  constructor() {
    super("Stream is no longer live.")

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, StreamNoLongerLiveError.prototype)
  }
}
