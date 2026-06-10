/**
 * GET /api/stats?range=7d|30d|90d|all
 *
 * Devuelve métricas agregadas del buscador para el panel admin de WP.
 *
 * Estructura de respuesta:
 *   {
 *     range: string,                  // rango aplicado
 *     totals: {
 *       searches, clicks, leads,
 *       uniqueSessions, avgSearchesPerSession,
 *       searchToClickRate, clickToLeadRate,
 *       abandonRate,                  // sesiones que buscaron y no clickearon
 *       newSessions, returningSessions
 *     },
 *     topSearches: [{ query, count }],          // top 20
 *     emptySearches: [{ query, count }],        // hasta 20
 *     topProducts: [{ itemId, itemName, count }],  // top 10
 *     topSubstances: [{ itemId, itemName, count }], // top 10
 *     searchesByDay: [{ date, count }]
 *   }
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function rangeToDate(range: string): Date | null {
  const now = Date.now();
  switch (range) {
    case "7d":  return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d": return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d": return new Date(now - 90 * 24 * 60 * 60 * 1000);
    case "all": return null;
    default:    return new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
}

type RawCount = { value: string; count: bigint };
type DayCount = { day: Date; count: bigint };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";
  const since = rangeToDate(range);
  const sinceClause = since
    ? `AND "createdAt" >= '${since.toISOString()}'`
    : "";

  // 1. Totales por tipo de evento
  const totalsRaw = await prisma.$queryRawUnsafe<{ eventType: string; count: bigint }[]>(
    `SELECT "eventType", COUNT(*)::bigint as count
     FROM "SearchEvent"
     WHERE 1=1 ${sinceClause}
     GROUP BY "eventType"`
  );
  const totals = { searches: 0, clicks: 0, leads: 0 };
  for (const t of totalsRaw) {
    if (t.eventType === "search") totals.searches = Number(t.count);
    else if (t.eventType === "click") totals.clicks = Number(t.count);
    else if (t.eventType === "lead") totals.leads = Number(t.count);
  }

  // 2. Sesiones únicas + nuevos vs recurrentes
  const sessionsRaw = await prisma.$queryRawUnsafe<{ sessions: bigint; returning: bigint }[]>(
    `SELECT
       COUNT(DISTINCT "sessionId")::bigint AS sessions,
       COUNT(DISTINCT CASE WHEN "isReturning" THEN "sessionId" END)::bigint AS returning
     FROM "SearchEvent"
     WHERE 1=1 ${sinceClause}`
  );
  const uniqueSessions = Number(sessionsRaw[0]?.sessions ?? 0);
  const returningSessions = Number(sessionsRaw[0]?.returning ?? 0);
  const newSessions = Math.max(0, uniqueSessions - returningSessions);

  // 3. Sesiones que buscaron pero no clickearon (abandono)
  const abandonRaw = await prisma.$queryRawUnsafe<{ abandoned: bigint }[]>(
    `SELECT COUNT(DISTINCT s."sessionId")::bigint AS abandoned
     FROM "SearchEvent" s
     WHERE s."eventType" = 'search' ${sinceClause}
       AND NOT EXISTS (
         SELECT 1 FROM "SearchEvent" c
         WHERE c."sessionId" = s."sessionId"
           AND c."eventType" IN ('click','lead')
       )`
  );
  const abandonedSessions = Number(abandonRaw[0]?.abandoned ?? 0);

  // 4. Ratios
  const searchToClickRate = totals.searches > 0
    ? Math.round((totals.clicks / totals.searches) * 1000) / 10
    : 0;
  const clickToLeadRate = totals.clicks > 0
    ? Math.round((totals.leads / totals.clicks) * 1000) / 10
    : 0;
  const searchSessionsRaw = await prisma.$queryRawUnsafe<{ c: bigint }[]>(
    `SELECT COUNT(DISTINCT "sessionId")::bigint AS c
     FROM "SearchEvent"
     WHERE "eventType" = 'search' ${sinceClause}`
  );
  const sessionsWithSearch = Number(searchSessionsRaw[0]?.c ?? 0);
  const abandonRate = sessionsWithSearch > 0
    ? Math.round((abandonedSessions / sessionsWithSearch) * 1000) / 10
    : 0;
  const avgSearchesPerSession = sessionsWithSearch > 0
    ? Math.round((totals.searches / sessionsWithSearch) * 10) / 10
    : 0;

  // 5. Top 20 búsquedas
  const topSearchesRaw = await prisma.$queryRawUnsafe<RawCount[]>(
    `SELECT LOWER(query) AS value, COUNT(*)::bigint AS count
     FROM "SearchEvent"
     WHERE "eventType" = 'search'
       AND query IS NOT NULL AND query <> '' ${sinceClause}
     GROUP BY LOWER(query)
     ORDER BY count DESC
     LIMIT 20`
  );

  // 6. Búsquedas sin resultados (top 20)
  const emptySearchesRaw = await prisma.$queryRawUnsafe<RawCount[]>(
    `SELECT LOWER(query) AS value, COUNT(*)::bigint AS count
     FROM "SearchEvent"
     WHERE "eventType" = 'search'
       AND query IS NOT NULL AND query <> ''
       AND "resultsCount" = 0 ${sinceClause}
     GROUP BY LOWER(query)
     ORDER BY count DESC
     LIMIT 20`
  );

  // 7. Top 10 productos clickeados
  const topProductsRaw = await prisma.$queryRawUnsafe<{ itemId: number; itemName: string; count: bigint }[]>(
    `SELECT "itemId", "itemName", COUNT(*)::bigint AS count
     FROM "SearchEvent"
     WHERE "eventType" = 'click'
       AND "itemKind" = 'product'
       AND "itemName" IS NOT NULL ${sinceClause}
     GROUP BY "itemId", "itemName"
     ORDER BY count DESC
     LIMIT 10`
  );

  // 8. Top 10 sustancias clickeadas
  const topSubstancesRaw = await prisma.$queryRawUnsafe<{ itemId: number; itemName: string; count: bigint }[]>(
    `SELECT "itemId", "itemName", COUNT(*)::bigint AS count
     FROM "SearchEvent"
     WHERE "eventType" = 'click'
       AND "itemKind" = 'substance'
       AND "itemName" IS NOT NULL ${sinceClause}
     GROUP BY "itemId", "itemName"
     ORDER BY count DESC
     LIMIT 10`
  );

  // 9. Búsquedas por día (últimos 30 días aunque pidan otro rango — para gráfico)
  const byDayRaw = await prisma.$queryRawUnsafe<DayCount[]>(
    `SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS count
     FROM "SearchEvent"
     WHERE "eventType" = 'search' ${sinceClause}
     GROUP BY day
     ORDER BY day ASC`
  );

  return NextResponse.json({
    range,
    since: since ? since.toISOString() : null,
    totals: {
      searches: totals.searches,
      clicks: totals.clicks,
      leads: totals.leads,
      uniqueSessions,
      newSessions,
      returningSessions,
      sessionsWithSearch,
      abandonedSessions,
      searchToClickRate,
      clickToLeadRate,
      abandonRate,
      avgSearchesPerSession,
    },
    topSearches: topSearchesRaw.map((r) => ({ query: r.value, count: Number(r.count) })),
    emptySearches: emptySearchesRaw.map((r) => ({ query: r.value, count: Number(r.count) })),
    topProducts: topProductsRaw.map((r) => ({
      itemId: r.itemId, itemName: r.itemName, count: Number(r.count),
    })),
    topSubstances: topSubstancesRaw.map((r) => ({
      itemId: r.itemId, itemName: r.itemName, count: Number(r.count),
    })),
    searchesByDay: byDayRaw.map((r) => ({
      date: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    })),
  }, { headers: corsHeaders() });
}
