import type { ChatMessage as BaseChatMessage } from "@twurple/chat"

// The reason we have to make this type at all is because
// BaseChatMessage extends MessageTypes.Commands.PrivateMessage, but
// PrivateMessage isn't exported.
export interface ChatMessage extends BaseChatMessage {
  target: string
  text: string
}
