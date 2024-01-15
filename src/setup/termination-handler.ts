import { db } from "../database/database.js"

export function setUpTerminationHandler() {
  process.once("SIGTERM", async () => {
    console.log("SIGTERM received. Closing everything down.")
    await db.destroy()
    console.log("Closed database connection. Exiting.")
  })
}
