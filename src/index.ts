import * as db from "./db.ts";
import * as streams from "./streams.ts";
import * as api from "./api.ts";

db.initialize();

console.log("✅ Database initialized, Retention: 20 hours");

streams.connectPosition();
streams.connectAnnouncement();

setInterval(
  () => {
    const result = db.cleanup(20);
    console.info(
      `🧹 Cleanup: removed ${result.positions} old positions and ${result.announcements} old announcements`,
    );
  },
  60 * 60 * 1000,
);

console.info("🚀 SSE consumer started");

// Start the API server
await api.startServer();
