import type { Insertable } from "kysely"

import type { Commands, CommandNames } from "./db"

export type NewCommand = Insertable<Commands>
export type NewCommandName = Insertable<CommandNames>
