import type { ColumnType } from "kysely"

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>

export type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface CommandNames {
  created_at: Generated<Timestamp>
  id: string
  name: string
}

export interface Commands {
  can_be_deleted: Generated<boolean>
  created_at: Generated<Timestamp>
  id: string
  is_privileged: Generated<boolean>
  updated_at: Generated<Timestamp>
}

export interface CommandUsage {
  command_name: string
  full_message: string
  usage_time: Generated<Timestamp>
  user_id: string
}

export interface TextCommandResponses {
  created_at: Generated<Timestamp>
  id: string
  response: string
  updated_at: Generated<Timestamp>
}

export interface UserCorrelation {
  created_at: Generated<Timestamp>
  discord_id: string | null
  id: string
  twitch_id: string | null
}

export interface Users {
  created_at: Generated<Timestamp>
  id: string
}

export interface DB {
  command_names: CommandNames
  command_usage: CommandUsage
  commands: Commands
  text_command_responses: TextCommandResponses
  user_correlation: UserCorrelation
  users: Users
}
