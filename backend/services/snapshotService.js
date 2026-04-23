import cron from "node-cron";
import { generateSnapshotsFromLiveData } from "../routes/traffic.js";

let snapshotJobStarted = false;

export function startSnapshotJob() {
  if (snapshotJobStarted) {
    console.log("[snapshot] Cron already started");
    return;
  }

  snapshotJobStarted = true;

  cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("[snapshot] Running scheduled traffic snapshot job...");
      const result = await generateSnapshotsFromLiveData();
      console.log(
        `[snapshot] Done. Routes snapped: ${result?.summary?.routeCount || 0}`
      );
    } catch (error) {
      console.error("[snapshot] Scheduled snapshot failed:", error);
    }
  });

  console.log("[snapshot] Cron initialized: every 15 minutes");
}