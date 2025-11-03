import { Database } from "sqlite";
import type { AnnouncementRecord, PositionRecord } from "./types.ts";

export const db = new Database("sse-data.db");

export function initialize(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operational_train_number TEXT NOT NULL,
      operational_train_departure_date TEXT NOT NULL,
      journey_plan_number TEXT,
      journey_plan_departure_date TEXT,
      advertised_train_number TEXT,
      latitude REAL,
      longitude REAL,
      sweref99tm_x REAL,
      sweref99tm_y REAL,
      timestamp TEXT NOT NULL,
      bearing REAL,
      speed REAL,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_positions_train
    ON positions(operational_train_number, created_at DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_positions_date
    ON positions(created_at DESC)
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_type TEXT,
      advertised_time_at_location TEXT,
      advertised_train_ident TEXT,
      from_location_name TEXT,
      from_location_priority INTEGER,
      to_location_name TEXT,
      to_location_priority INTEGER,
      location_signature TEXT,
      product_code TEXT,
      product_description TEXT,
      time_at_location_with_seconds TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_announcements_train
    ON announcements(advertised_train_ident, created_at DESC)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_announcements_date
    ON announcements(created_at DESC)
  `);
}

function parseWktPoint(wkt: string): { x: number; y: number } | null {
  if (!wkt) return null;
  const match = wkt.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/);
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
}

export function savePosition(position: PositionRecord): void {
  const wgs84 = parseWktPoint(position.Position.WGS84 || "");
  const sweref = parseWktPoint(position.Position.SWEREF99TM || "");
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO positions (
      operational_train_number,
      operational_train_departure_date,
      journey_plan_number,
      journey_plan_departure_date,
      advertised_train_number,
      latitude,
      longitude,
      sweref99tm_x,
      sweref99tm_y,
      timestamp,
      bearing,
      speed,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    position.Train.OperationalTrainNumber,
    position.Train.OperationalTrainDepartureDate,
    position.Train.JourneyPlanNumber || null,
    position.Train.JourneyPlanDepartureDate || null,
    position.Train.AdvertisedTrainNumber || null,
    wgs84?.y || null, // latitude
    wgs84?.x || null, // longitude
    sweref?.x || null,
    sweref?.y || null,
    position.TimeStamp,
    position.Bearing || null,
    position.Speed || null,
    now,
  );
}

export function saveAnnouncement(announcement: AnnouncementRecord): void {
  const fromLoc = announcement.FromLocation[0];
  const toLoc = announcement.ToLocation[0];
  const productInfo = announcement.ProductInformation[0];
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO announcements (
      activity_type,
      advertised_time_at_location,
      advertised_train_ident,
      from_location_name,
      from_location_priority,
      to_location_name,
      to_location_priority,
      location_signature,
      product_code,
      product_description,
      time_at_location_with_seconds,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    announcement.ActivityType || null,
    announcement.AdvertisedTimeAtLocation || null,
    announcement.AdvertisedTrainIdent || null,
    fromLoc?.LocationName || null,
    fromLoc?.Priority || null,
    toLoc?.LocationName || null,
    toLoc?.Priority || null,
    announcement.LocationSignature || null,
    productInfo?.Code || null,
    productInfo?.Description || null,
    announcement.TimeAtLocationWithSeconds || null,
    now,
  );
}

export function getRecentPositions(
  trainNumber: string,
  hoursBack: number = 1,
): Record<string, unknown>[] {
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
  return db
    .prepare(
      `
      SELECT * FROM positions
      WHERE operational_train_number = ? AND created_at > ?
      ORDER BY created_at DESC
    `,
    )
    .all(trainNumber, cutoff) as Record<string, unknown>[];
}

export function getRecentAnnouncements(
  trainIdent: string,
  hoursBack: number = 1,
): Record<string, unknown>[] {
  const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
  return db
    .prepare(
      `
      SELECT * FROM announcements
      WHERE advertised_train_ident = ? AND created_at > ?
      ORDER BY created_at DESC
    `,
    )
    .all(trainIdent, cutoff) as Record<string, unknown>[];
}

export function cleanup(hoursToKeep: number = 20): {
  positions: number;
  announcements: number;
} {
  const cutoff = Date.now() - hoursToKeep * 60 * 60 * 1000;

  const posChanges = db
    .prepare(`DELETE FROM positions WHERE created_at < ?`)
    .run(cutoff);
  const annChanges = db
    .prepare(`DELETE FROM announcements WHERE created_at < ?`)
    .run(cutoff);

  return {
    positions: typeof posChanges === "number" ? posChanges : 0,
    announcements: typeof annChanges === "number" ? annChanges : 0,
  };
}

export function getStats(): { positions: number; announcements: number } {
  const pos = (
    db.prepare(`SELECT COUNT(*) as count FROM positions`).get() as {
      count: number;
    }
  ).count;
  const ann = (
    db.prepare(`SELECT COUNT(*) as count FROM announcements`).get() as {
      count: number;
    }
  ).count;
  return { positions: pos, announcements: ann };
}
