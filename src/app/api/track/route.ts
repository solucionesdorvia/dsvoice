/**
 * POST /api/track
 *
 * Endpoint liviano para registrar eventos del buscador desde el frontend.
 * Sin auth — confía en CORS y rate-limit (futuro). El sessionId lo genera
 * el cliente (random) y se persiste en sessionStorage; isReturning viene
 * de detectar localStorage previo.
 *
 * Body JSON:
 *   {
 *     sessionId: string,                    // requerido
 *     eventType: "search" | "click" | "lead",
 *     query?: string,
 *     filter?: "all" | "substances" | "products",
 *     resultsCount?: number,
 *     itemKind?: "substance" | "product",
 *     itemId?: number,
 *     itemName?: string,
 *     isReturning?: boolean,
 *   }
 *
 * Respuesta: 204 No Content (siempre, incluso si falla — no debe romper
 * la experiencia del usuario).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set(["search", "click", "lead"]);
const ALLOWED_FILTERS = new Set(["all", "substances", "products"]);
const ALLOWED_KINDS = new Set(["substance", "product"]);

function clamp(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const sessionId = clamp(body.sessionId, 64);
    const eventType = clamp(body.eventType, 20);
    if (!sessionId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
      return new NextResponse(null, { status: 204 });
    }

    const filter = clamp(body.filter, 20);
    const itemKind = clamp(body.itemKind, 20);

    const ua = request.headers.get("user-agent") || "";

    await prisma.searchEvent.create({
      data: {
        sessionId,
        eventType,
        query: clamp(body.query, 200),
        filter: filter && ALLOWED_FILTERS.has(filter) ? filter : null,
        resultsCount: typeof body.resultsCount === "number" ? body.resultsCount : null,
        itemKind: itemKind && ALLOWED_KINDS.has(itemKind) ? itemKind : null,
        itemId: typeof body.itemId === "number" ? body.itemId : null,
        itemName: clamp(body.itemName, 200),
        userAgent: ua ? ua.slice(0, 200) : null,
        isReturning: !!body.isReturning,
      },
    });
  } catch {
    // Silenciamos: el tracking no debe romper la UX.
  }

  return new NextResponse(null, { status: 204 });
}
