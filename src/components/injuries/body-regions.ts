/**
 * Piezas de la figura del cuerpo de FullTime (dibujo propio), de frente y de espalda.
 * Cada pieza es un grupo muscular o articulación que se puede tocar, y sabe qué zona es.
 * Lienzo: 100 de ancho × 220 de alto. Las piezas "pares" se dibujan una sola vez para el lado
 * izquierdo de la pantalla y se reflejan solas para el derecho.
 * De frente, el lado izquierdo de la pantalla es el lado DERECHO de la jugadora; de espalda, al revés.
 */
import type { BodySide, Laterality, Zone } from "@/lib/lesiones";

export const BODY_W = 100;
export const BODY_H = 220;

export type RegionDef = {
  id: string;
  name: string;      // nombre que ve el entrenador al tocar
  zone: Zone;
  d: string;         // contorno de la pieza
  pair: boolean;     // true = existe a los dos lados (se refleja)
  lines?: string[];  // líneas internas que marcan las fibras del músculo
};

export type Region = { key: string; name: string; zone: Zone; laterality: Laterality; d: string; lines: string[]; mirrored: boolean };

// Piezas que son iguales de frente y de espalda (brazo, pierna baja, cabeza).
const HEAD: RegionDef = { id: "cabeza", name: "Cabeza", zone: "cabeza", pair: false, d: "M50,1.4 C56.2,1.4 59.2,6 59.2,12 C59.2,18.4 55.4,22.8 50,22.8 C44.6,22.8 40.8,18.4 40.8,12 C40.8,6 43.8,1.4 50,1.4 Z" };
const DELTOID: RegionDef = { id: "deltoides", name: "Hombro (deltoides)", zone: "hombro", pair: true, d: "M33.4,30.6 Q25,29.8 21.8,37.6 Q21.2,43 23,47.2 Q28.2,45.4 31.6,40.6 Q33.6,36 33.4,30.6 Z", lines: ["M30.4,32.6 Q25.6,36 24.4,44.8", "M27,31.6 Q23.4,36.4 22.8,42"] };
const ELBOW: RegionDef = { id: "codo", name: "Codo", zone: "codo", pair: true, d: "M20.8,60 Q24.4,63 28.6,62 L27.6,68.2 Q23.2,69.8 19.4,67.2 Z" };
const HAND: RegionDef = { id: "mano", name: "Muñeca y mano", zone: "mano", pair: true, d: "M19.2,90 L24.6,90 Q25.6,98 24.4,105 Q21.6,108.8 19,106.2 Q17,98 19.2,90 Z", lines: ["M19.4,93.4 L24.8,93.4"] };
const ANKLE_D = "M37.6,190 L47,190 L46.6,203.6 L37.2,203.6 Z";
const FOOT_D = "M37.2,203.6 L46.6,203.6 Q48.8,209 49,216.4 L35.8,216.4 Q35.4,209 37.2,203.6 Z";
const KNEE_D = "M35.6,137.4 Q40.2,140.2 44.6,137 Q46.2,138.6 48.2,137.6 L48,150.6 Q42,153.2 36.4,150.6 Q35.6,144 35.6,137.4 Z";
const LOWER_LEG_D = "M36.4,150.6 Q42,153.2 48,150.6 Q48.8,166 47,190 L37.6,190 Q33.6,168 36.4,150.6 Z";
const UPPER_ARM_D = "M23,47.2 Q27.6,45.2 31.6,46 Q31.2,56 28.6,62 Q24.4,63 20.8,60 Q20.8,52 23,47.2 Z";
const FOREARM_D = "M19.4,67.2 Q23.2,69.8 27.6,68.2 Q26.6,80 24.6,90 L19.2,90 Q16.8,78 19.4,67.2 Z";

const FRONT: RegionDef[] = [
  HEAD,
  { id: "cuello", name: "Cuello", zone: "cuello", pair: false, d: "M45.8,21 Q50,23.6 54.2,21 L54.8,28.4 Q60,29.6 66.6,30.6 Q57,30.6 50.4,33.8 L49.6,33.8 Q43,30.6 33.4,30.6 Q40,29.6 45.2,28.4 Z", lines: ["M47.4,23 L49.2,32.6", "M52.6,23 L50.8,32.6"] },
  DELTOID,
  { id: "pectoral", name: "Pecho (pectoral)", zone: "pecho", pair: true, d: "M33.4,30.6 Q43,30.6 49.6,33.8 L49.6,51 Q42,56.4 34.2,52.2 Q31.2,46.4 31.6,40.6 Q33.6,36 33.4,30.6 Z", lines: ["M34.4,38 Q42,37 49,39.6", "M33.4,44 Q41,44.6 48.8,45.6", "M35,49.6 Q42,51.6 48.6,50.4"] },
  { id: "biceps", name: "Brazo (bíceps)", zone: "brazo", pair: true, d: UPPER_ARM_D, lines: ["M26.6,47 Q25.4,54 25.4,61.6"] },
  ELBOW,
  { id: "antebrazo", name: "Antebrazo", zone: "antebrazo", pair: true, d: FOREARM_D, lines: ["M23.4,69.8 Q22.4,80 22.2,89"] },
  HAND,
  { id: "abdominales", name: "Abdominales", zone: "abdomen", pair: false, d: "M42.6,53.6 Q50,50.6 57.4,53.6 L56.6,84 Q50,90.6 43.4,84 Z", lines: ["M50,52 L50,88", "M43,61.4 Q50,59.6 57,61.4", "M43.2,69.4 Q50,67.8 56.8,69.4", "M43.4,77.2 Q50,75.8 56.6,77.2"] },
  { id: "oblicuo", name: "Costado (oblicuo)", zone: "abdomen", pair: true, d: "M34.2,52.2 Q38.6,55.4 42.6,53.6 L43.4,84 Q39,88 34,86 Q36,77 35.4,70 Q32.8,60 34.2,52.2 Z", lines: ["M35,58 L42.4,61", "M35.6,65 L42.8,68.4", "M36,72.4 L43,76"] },
  { id: "cadera", name: "Cadera o ingle", zone: "cadera_ingle", pair: true, d: "M34,86 Q39,88 43.4,84 Q47,88.4 50,89 L50,103.4 Q42,101.6 33,100 Q33,92 34,86 Z", lines: ["M35,90 Q42,95 49.6,101.6"] },
  { id: "cuadriceps", name: "Muslo de frente (cuádriceps)", zone: "muslo_anterior", pair: true, d: "M33,100 Q39.6,101.2 44.6,102.6 Q46.2,120 44.6,137 Q40.2,140.2 35.6,137.4 Q30.8,118 33,100 Z", lines: ["M39.4,102 Q40.8,120 39.8,138.4", "M36,104 Q35.2,122 37.8,137.6"] },
  { id: "aductor", name: "Aductor", zone: "aductor", pair: true, d: "M44.6,102.6 Q48,103.2 50,103.4 L49.6,118 Q49,130 48.2,137.6 Q46.2,138.6 44.6,137 Q46.2,120 44.6,102.6 Z", lines: ["M47.6,104 Q47.8,120 47,136"] },
  { id: "rodilla", name: "Rodilla", zone: "rodilla", pair: true, d: KNEE_D, lines: ["M38.6,141.6 Q42,139.8 45.6,141.6 Q46.4,145.6 45.2,148.6 Q42,150.4 39,148.6 Q37.8,145.4 38.6,141.6 Z"] },
  { id: "espinilla", name: "Espinilla", zone: "espinilla", pair: true, d: LOWER_LEG_D, lines: ["M43.4,152.6 Q44.6,170 43.6,189.4", "M39.6,153 Q37.6,170 40.6,188"] },
  { id: "tobillo", name: "Tobillo", zone: "tobillo", pair: true, d: ANKLE_D },
  { id: "pie", name: "Pie", zone: "pie", pair: true, d: FOOT_D, lines: ["M39.6,210 L39.2,216", "M42.6,210 L42.6,216", "M45.6,210.4 L46,216"] },
];

const BACK: RegionDef[] = [
  HEAD,
  { id: "cuello", name: "Cuello (nuca)", zone: "cuello", pair: false, d: "M45.8,21 Q50,23.6 54.2,21 L54.6,27.2 Q50,25.4 45.4,27.2 Z" },
  { id: "trapecio", name: "Espalda alta (trapecio)", zone: "espalda_alta", pair: false, d: "M50,25.4 Q46,27.4 33.4,30.6 Q40.6,35.6 45,46 L50,60 L55,46 Q59.4,35.6 66.6,30.6 Q54,27.4 50,25.4 Z", lines: ["M50,26.4 L50,59", "M36.6,31.6 Q44,34 49.4,40", "M63.4,31.6 Q56,34 50.6,40"] },
  DELTOID,
  { id: "dorsal", name: "Espalda alta (dorsal)", zone: "espalda_alta", pair: true, d: "M33.4,30.6 Q40.6,35.6 45,46 L50,60 L50,66.2 Q42,68 35.4,70 Q32.4,58 31.6,46 Q31.8,38 33.4,30.6 Z", lines: ["M33.6,44 Q41,50 49.2,60.4", "M33.4,52 Q40,58 49.2,64.6", "M34.4,60.4 Q40,64.6 46,66.6"] },
  { id: "lumbar", name: "Espalda baja (lumbar)", zone: "espalda_baja", pair: false, d: "M35.4,70 Q42,68 50,66.2 Q58,68 64.6,70 Q64,79 66,88 Q58,84 50,84 Q42,84 34,88 Q36,79 35.4,70 Z", lines: ["M50,66.6 L50,84", "M44.6,69 Q45.6,77 44.4,84.4", "M55.4,69 Q54.4,77 55.6,84.4"] },
  { id: "triceps", name: "Brazo (tríceps)", zone: "brazo", pair: true, d: UPPER_ARM_D, lines: ["M24.4,48.4 Q26.6,54 25.8,61.4", "M29.4,47 Q27.6,52 27.6,57"] },
  ELBOW,
  { id: "antebrazo", name: "Antebrazo", zone: "antebrazo", pair: true, d: FOREARM_D, lines: ["M22,69.6 Q21.6,80 22.6,89"] },
  HAND,
  { id: "gluteo", name: "Glúteo", zone: "gluteo", pair: true, d: "M34,88 Q42,84 50,84 L50,104.6 Q42,108.6 33.2,103 Q32.6,95 34,88 Z", lines: ["M36.4,90 Q41,96 48.6,97"] },
  { id: "isquiotibial", name: "Muslo de atrás (isquiotibial)", zone: "muslo_posterior", pair: true, d: "M33.2,103 Q42,108.6 50,104.6 L49.6,118 Q49,130 48.2,137.6 Q42,140.4 35.6,137.4 Q30.8,119 33.2,103 Z", lines: ["M42,108 Q42.8,122 42,138.6", "M37,106.6 Q36.6,122 38.6,138"] },
  { id: "corva", name: "Rodilla (parte de atrás)", zone: "rodilla", pair: true, d: KNEE_D, lines: ["M38,144 Q42,146.6 46.4,144"] },
  { id: "gemelo", name: "Pantorrilla (gemelo)", zone: "pantorrilla", pair: true, d: LOWER_LEG_D, lines: ["M42.2,152.6 Q42.6,164 42,176", "M37,160 Q39,172 42,176 Q45.6,172 47.6,160", "M42,176 L42.2,189.6"] },
  { id: "aquiles", name: "Tobillo (tendón de Aquiles)", zone: "tobillo", pair: true, d: ANKLE_D, lines: ["M42.2,190 L42.2,203.4"] },
  { id: "talon", name: "Pie (talón)", zone: "pie", pair: true, d: FOOT_D },
];

/** Refleja un contorno al otro lado de la figura (x → 100 − x). Solo usa M, L, Q, C y Z con coordenadas absolutas. */
export function mirrorPath(d: string): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x: string, y: string) => `${Math.round((BODY_W - Number(x)) * 100) / 100},${y}`);
}

/** Todas las piezas de una figura, ya con su lado puesto. */
export function regionsFor(side: BodySide): Region[] {
  const defs = side === "frente" ? FRONT : BACK;
  // De frente: izquierda de la pantalla = derecha de la jugadora. De espalda: izquierda = izquierda.
  const screenLeft: Laterality = side === "frente" ? "derecha" : "izquierda";
  const screenRight: Laterality = side === "frente" ? "izquierda" : "derecha";
  const out: Region[] = [];
  for (const r of defs) {
    if (!r.pair) {
      out.push({ key: r.id, name: r.name, zone: r.zone, laterality: "centro", d: r.d, lines: r.lines ?? [], mirrored: false });
      continue;
    }
    out.push({ key: `${r.id}-a`, name: r.name, zone: r.zone, laterality: screenLeft, d: r.d, lines: r.lines ?? [], mirrored: false });
    out.push({ key: `${r.id}-b`, name: r.name, zone: r.zone, laterality: screenRight, d: mirrorPath(r.d), lines: (r.lines ?? []).map(mirrorPath), mirrored: true });
  }
  return out;
}
