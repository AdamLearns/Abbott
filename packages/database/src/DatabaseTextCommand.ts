export interface DatabaseTextCommand {
  id: string
  can_be_deleted: boolean
  is_privileged: boolean
  name: string
  response: string
  updated_at: Date
}

export type TextCommand = Pick<
  DatabaseTextCommand,
  "name" | "response" | "updated_at"
>
