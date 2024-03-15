export class StreamNoLongerLiveError extends Error {
  constructor() {
    super("Stream is no longer live.")
  }
}
