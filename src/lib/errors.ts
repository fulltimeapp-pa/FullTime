/**
 * Mensajes de error para la pantalla: nunca el error crudo de la base ni en inglés.
 */

/** Traduce un mensaje de error de la base / Supabase a algo entendible. */
export function translateDbError(raw: string): string {
  const m = (raw || "").toLowerCase();
  if (!raw) return "Algo salió mal. Vuelve a intentarlo.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed"))
    return "Sin conexión. Revisa tu internet y vuelve a intentarlo.";
  if (m.includes("row-level security") || m.includes("permission") || m.includes("403"))
    return "No tienes permiso para hacer esto en este club.";
  if (m.includes("duplicate") || m.includes("unique"))
    return "Ya existe un registro con esos datos.";
  if (m.includes("call_ups_ends_after_starts"))
    return "La hora de fin tiene que ser después de la de inicio.";
  if (m.includes("call_ups_meet_before_starts"))
    return "La hora de convocatoria tiene que ser antes del partido.";
  if (m.includes("jwt") || m.includes("not authenticated"))
    return "Tu sesión venció. Vuelve a entrar.";
  return "No pudimos completar la acción. Vuelve a intentarlo.";
}

/**
 * Para cualquier error atrapado: los que armamos nosotros (ya en español) se
 * muestran tal cual; los de la base o la red se traducen.
 */
export function friendlyError(e: unknown, fallback = "No pudimos completar la acción. Vuelve a intentarlo."): string {
  if (!e) return fallback;
  const msg = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message ?? "") : String(e);
  const fromDb = typeof e === "object" && e !== null && ("code" in e || "details" in e || "hint" in e);
  if (fromDb) return translateDbError(msg);
  if (/failed to fetch|network|load failed|jwt/i.test(msg)) return translateDbError(msg);
  return msg || fallback;
}
