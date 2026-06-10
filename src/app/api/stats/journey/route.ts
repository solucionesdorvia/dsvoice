/**
 * GET /api/stats/journey?sessionId=...
 * GET /api/stats/journey?range=7d (lista sesiones recientes)
 *
 * Endpoint avanzado para ver el recorrido completo de un visitante:
 * todos los eventos en orden cronológico de una sesión específica.
 * Si no se pasa sessionId, devuelve la lista de sesiones recientes
 * para elegir cuál inspeccionar.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

function rangeToDate(range: string): Date {
  const now = Date.now();
  switch (range) {
    case "1d":  return new Date(now - 1 * 24 * 60 * 60 * 1000);
    case "7d":  return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:    return new Date(now - 7 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (sessionId) {
    // Recorrido completo de una sesión
    const events = await prisma.searchEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    return NextResponse.json({
      sessionId,
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        query: e.query,
        filter: e.filter,
        resultsCount: e.resultsCount,
        itemKind: e.itemKind,
        itemName: e.itemName,
        isReturning: e.isReturning,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  }

  // Lista de sesiones recientes
  const range = url.searchParams.get("range") ?? "7d";
  const since = rangeToDate(range);
  const sessions = await prisma.$queryRawUnsafe<{
    sessionId: string;
    events: bigint;
    firstSeen: Date;
    lastSeen: Date;
    isReturning: boolean;
  }[]>(
    `SELECT
       "sessionId",
       COUNT(*)::bigint AS events,
       MIN("createdAt") AS "firstSeen",
       MAX("createdAt") AS "lastSeen",
       BOOL_OR("isReturning") AS "isReturning"
     FROM "SearchEvent"
     WHERE "createdAt" >= $1
     GROUP BY "sessionId"
     ORDER BY MAX("createdAt") DESC
     LIMIT 50`,
    since
  );

  return NextResponse.json({
    range,
    sessions: sessions.map((s) => ({
      sessionId: s.sessionId,
      events: Number(s.events),
      firstSeen: s.firstSeen.toISOString(),
      lastSeen: s.lastSeen.toISOString(),
      isReturning: s.isReturning,
    })),
  });
}
