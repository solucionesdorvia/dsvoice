/** Resuelve URL absoluta de imágenes de producto Dräger (rutas relativas o absolutas). */
export function dragerProductImageUrl(
  imageSrc: string | null | undefined,
): string | null {
  if (!imageSrc) return null;
  if (imageSrc.startsWith("http")) return imageSrc;
  if (imageSrc.startsWith("/")) return `https://www.draeger.com${imageSrc}`;
  return `https://www.draeger.com/${imageSrc}`;
}
