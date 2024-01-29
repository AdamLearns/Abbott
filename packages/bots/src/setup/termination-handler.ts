import { db } from "abbott-database"

export function setUpTerminationHandler() {
  onProcessClose(async () => {
    console.log("Signal to close received. Closing everything down.")
    await db.destroy()
    console.log("Closed database connection. Exiting.")
  })
}

export function onProcessClose(callback: () => void) {
  process.once("SIGINT", callback)
  process.once("SIGTERM", callback)
}
