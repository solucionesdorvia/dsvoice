import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS para las rutas /api/* — permite que el WordPress del cliente
 * (dragersolutions.com.ar) consuma el buscador via fetch().
 *
 * Configurable por env var ALLOWED_CORS_ORIGINS (lista separada por
 * comas o espacios). Default incluye los dominios apex + www del cliente.
 */
const ALLOWED_ORIGINS = new Set(
  (
    process.env.ALLOWED_CORS_ORIGINS ??
    "https://dragersolutions.com.ar,https://www.dragersolutions.com.ar"
  )
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
);

export const config = {
  matcher: "/api/:path*",
};

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : null;

  // Preflight
  if (request.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    if (allowed) applyCors(res, allowed);
    return res;
  }

  const res = NextResponse.next();
  if (allowed) applyCors(res, allowed);
  return res;
}

function applyCors(res: NextResponse, origin: string) {
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.append("Vary", "Origin");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.headers.set("Access-Control-Max-Age", "86400");
}
