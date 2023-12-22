// Note: the only point of this file is to automatically run migrations just by
// importing this file (as opposed to importing a function and then having to
// call the function). At the time of writing, the caller that needs this is the
// "kysely-migration-cli" script in package.json.

import { migrate } from "./migrate-fn"

migrate()
