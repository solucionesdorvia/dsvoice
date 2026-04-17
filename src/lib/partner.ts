/**
 * Identidad del implementador del buscador (p. ej. DS SAFETY y su catálogo Dräger).
 * Configurar con NEXT_PUBLIC_* en .env — valores por defecto orientados al catálogo
 * "Catálogo digital DRAGER - DS SAFETY".
 */
export const partner = {
  /** Nombre comercial del integrador (aparece en cabecera y pie). */
  name: process.env.NEXT_PUBLIC_PARTNER_NAME ?? "DS SAFETY",
  /** Línea corta bajo el nombre (opcional). */
  tagline:
    process.env.NEXT_PUBLIC_PARTNER_TAGLINE ??
    "Soluciones de seguridad y protección respiratoria Dräger",
  /** Texto del enlace al catálogo PDF u otra URL pública. */
  catalogLabel:
    process.env.NEXT_PUBLIC_CATALOG_LABEL ??
    "Catálogo digital Dräger — DS SAFETY",
  /**
   * URL del PDF del catálogo (por defecto el archivo servido desde `public/`).
   * Podés sobreescribir con una URL absoluta en producción (CDN).
   */
  catalogUrl:
    process.env.NEXT_PUBLIC_CATALOG_URL?.trim() ||
    "/catalogo-drager-ds-safety.pdf",
  /** Sitio web del implementador (opcional). */
  websiteUrl: process.env.NEXT_PUBLIC_PARTNER_WEBSITE_URL?.trim() ?? "",
} as const;

export function hasCatalogLink(): boolean {
  return partner.catalogUrl.length > 0;
}
