import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export type Int8 = ColumnType<string, bigint | number | string, bigint | number | string>;

export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export interface CommandNames {
  created_at: Generated<Timestamp>;
  id: string;
  name: string;
}

export interface Commands {
  can_be_deleted: Generated<boolean>;
  created_at: Generated<Timestamp>;
  id: string;
  is_privileged: Generated<boolean>;
  updated_at: Generated<Timestamp>;
}

export interface CommandUsage {
  command_name: string;
  full_message: string;
  usage_time: Generated<Timestamp>;
  user_id: string;
}

export interface Config {
  created_at: Generated<Timestamp>;
  key: string;
  updated_at: Generated<Timestamp>;
  value: string | null;
}

export interface Points {
  created_at: Generated<Timestamp>;
  num_points: number;
  updated_at: Generated<Timestamp>;
  user_id: string;
}

export interface Quotes {
  author: string;
  created_at: Generated<Timestamp>;
  id: Generated<number>;
  quote: string;
  quoted_at: Generated<Timestamp>;
}

export interface TextCommandResponses {
  created_at: Generated<Timestamp>;
  id: string;
  response: string;
  updated_at: Generated<Timestamp>;
}

export interface TwitchNames {
  created_at: Generated<Timestamp>;
  name: string;
  twitch_id: string;
  updated_at: Generated<Timestamp>;
}

export interface TwitchOauthTokens {
  access_token: string;
  created_at: Generated<Timestamp>;
  expires_in: Int8;
  refresh_token: string;
  twitch_id: string;
  updated_at: Generated<Timestamp>;
}

export interface TwitchOauthTokenScopes {
  scope: string;
  twitch_id: string;
}

export interface UserCorrelation {
  created_at: Generated<Timestamp>;
  discord_id: string | null;
  id: string;
  twitch_id: string | null;
}

export interface Users {
  created_at: Generated<Timestamp>;
  id: string;
}

export interface DB {
  command_names: CommandNames;
  command_usage: CommandUsage;
  commands: Commands;
  config: Config;
  points: Points;
  quotes: Quotes;
  text_command_responses: TextCommandResponses;
  twitch_names: TwitchNames;
  twitch_oauth_token_scopes: TwitchOauthTokenScopes;
  twitch_oauth_tokens: TwitchOauthTokens;
  user_correlation: UserCorrelation;
  users: Users;
}
