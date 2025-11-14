import { saveAnnouncement, savePosition } from "./db.ts";
import {
  buildAnnouncementQuery,
  buildPositionQuery,
  fetchTrafikverket,
} from "./trafikverket.ts";
import type {
  AnnouncementRecord,
  PositionRecord,
  TrafikverketResponse,
  TrafikverketResultItem,
} from "./types.ts";

export async function connectPosition(): Promise<void> {
  try {
    console.info("🚂 Connecting to Trafikverket TrainPosition stream...");
    const result = await fetchTrafikverket(buildPositionQuery());
    const sseUrl = result.RESPONSE.RESULT[0].INFO.SSEURL;

    if (!sseUrl) {
      throw new Error("No SSE URL returned from Trafikverket");
    }

    const eventSource = new EventSource(sseUrl);
    console.info("✅ Position stream connected");

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data: TrafikverketResponse = JSON.parse(event.data);
        if (data.RESPONSE.RESULT) {
          data.RESPONSE.RESULT.forEach((resultItem: TrafikverketResultItem) => {
            if (resultItem.TrainPosition) {
              console.info(`${resultItem.TrainPosition.length} positions`);
              resultItem.TrainPosition.forEach((position: PositionRecord) => {
                savePosition(position);
              });
            }
          });
        }
      } catch (error) {
        console.error("Error processing position message:", error);
      }
    };

    eventSource.onerror = (error: Event) => {
      console.error("❌ Position stream error:", error);
      eventSource.close();
    };
  } catch (error) {
    console.error("❌ Position stream error:", error);
  }
}

export async function connectAnnouncement(): Promise<void> {
  try {
    console.info("📢 Connecting to Trafikverket TrainAnnouncement stream...");
    const result = await fetchTrafikverket(buildAnnouncementQuery());
    const sseUrl = result.RESPONSE.RESULT[0].INFO.SSEURL;

    if (!sseUrl) {
      throw new Error("No SSE URL returned from Trafikverket");
    }

    const eventSource = new EventSource(sseUrl);
    console.info("✅ Announcement stream connected");

    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data: TrafikverketResponse = JSON.parse(event.data);
        if (data.RESPONSE.RESULT) {
          data.RESPONSE.RESULT.forEach((resultItem: TrafikverketResultItem) => {
            if (resultItem.TrainAnnouncement) {
              console.info(
                `${resultItem.TrainAnnouncement.length} announcements`,
              );
              resultItem.TrainAnnouncement.forEach(
                (announcement: AnnouncementRecord) => {
                  saveAnnouncement(announcement);
                },
              );
            }
          });
        }
      } catch (error) {
        console.error("Error processing announcement message:", error);
      }
    };

    eventSource.onerror = (error: Event) => {
      console.error("❌ Announcement stream error:", error);
      eventSource.close();
    };
  } catch (error) {
    console.error("❌ Announcement stream error:", error);
  }
}
