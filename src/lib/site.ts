/**
 * Dirección pública de la app (ej. https://fulltime.vercel.app), sin "/" al final.
 * Se configura con VITE_SITE_URL. Único lugar donde vive la URL.
 * Si falta, los enlaces quedan relativos al sitio donde se abre la app.
 */
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) ?? "").replace(/\/+$/, "");

/** URL absoluta para compartir (invitaciones, imágenes de vista previa). */
export function siteUrl(path: string): string {
  const base = SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${path}`;
}
