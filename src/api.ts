import { db, getStats } from "./db.ts";
import type { AnnouncementRecord, PositionRecord } from "./types.ts";

const PORT = parseInt(Deno.env.get("PORT") || "3000");

export async function startServer(): Promise<void> {
  const handler = (req: Request): Response => {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/stats") {
      const stats = getStats();
      return new Response(JSON.stringify(stats), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("/positions/")) {
      const trainNumber = path.split("/")[2];
      const hoursParam = url.searchParams.get("hours");
      const hours = hoursParam ? parseInt(hoursParam) : 1;

      const positions = db
        .prepare(
          `
          SELECT * FROM positions
          WHERE operational_train_number = ? AND created_at > ?
          ORDER BY created_at DESC
        `,
        )
        .all(
          trainNumber,
          Date.now() - hours * 60 * 60 * 1000,
        ) as PositionRecord[];

      return new Response(JSON.stringify(positions), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("/announcements/")) {
      const trainIdent = path.split("/")[2];
      const hoursParam = url.searchParams.get("hours");
      const hours = hoursParam ? parseInt(hoursParam) : 1;

      const announcements = db
        .prepare(
          `
          SELECT * FROM announcements
          WHERE advertised_train_ident = ? AND created_at > ?
          ORDER BY created_at DESC
        `,
        )
        .all(
          trainIdent,
          Date.now() - hours * 60 * 60 * 1000,
        ) as AnnouncementRecord[];

      return new Response(JSON.stringify(announcements), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/positions") {
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "100"),
        1000,
      );
      const positions = db
        .prepare("SELECT * FROM positions ORDER BY created_at DESC LIMIT ?")
        .all(limit) as PositionRecord[];

      return new Response(JSON.stringify(positions), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (path === "/announcements") {
      const limit = Math.min(
        parseInt(url.searchParams.get("limit") || "100"),
        1000,
      );
      const announcements = db
        .prepare("SELECT * FROM announcements ORDER BY created_at DESC LIMIT ?")
        .all(limit) as AnnouncementRecord[];

      return new Response(JSON.stringify(announcements), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Not found",
        available_endpoints: [
          "GET /health",
          "GET /stats",
          "GET /positions?limit=100",
          "GET /positions/:trainNumber?hours=1",
          "GET /announcements?limit=100",
          "GET /announcements/:trainIdent?hours=1",
        ],
      }),
      { status: 404, headers: { "Content-Type": "application/json" } },
    );
  };

  console.info(`🚀 API server running on http://localhost:${PORT}`);
  await Deno.serve({ port: PORT }, handler);
}
