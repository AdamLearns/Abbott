import { commandPrefix } from "../constants.js"

export interface CommandData {
  name: string
  params: string[]
}

export function getCommandAndParams(text: string): CommandData | null {
  const [command, ...params] = text.split(" ")
  if (!command?.startsWith(commandPrefix)) {
    return null
  }
  const sliced = command.slice(commandPrefix.length)
  return {
    params,
    name: sliced,
  }
}
