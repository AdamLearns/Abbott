import type { Insertable, Selectable } from "kysely"

import type { Commands, CommandNames, Quotes } from "./db.js"

export type NewCommand = Insertable<Commands>
export type NewCommandName = Insertable<CommandNames>
export type Quote = Selectable<Quotes>
export type GetQuote = Pick<Quote, "id" | "quote" | "author" | "quoted_at">
