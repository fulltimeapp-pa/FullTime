/**
 * Formularios de wellness y RPE (tipo Google Forms). Cada club puede tener los suyos; si no tiene,
 * se usan las plantillas por defecto de aquí. Las respuestas guardan la pregunta tal como estaba.
 */
import { supabase } from "@/integrations/supabase/client";

export type FormKind = "wellness" | "rpe";
export type QuestionType = "escala5" | "escala10" | "si_no" | "opciones" | "texto";

export type Question = {
  id: string;
  label: string;
  type: QuestionType;
  hint?: string;
  options?: string[]; // solo "opciones"
  required: boolean;
  invert?: boolean;   // escala5: 5 es malo (ej. dolor, estrés); cuenta al revés en el puntaje
};

export type ClubForm = { id: string; club_id: string; kind: FormKind; name: string; questions: Question[]; is_default: boolean };

export type Answer = { id: string; label: string; type: QuestionType; value: number | string | boolean | null; invert?: boolean };

export type FormResponse = {
  id: string;
  call_up_id: string;
  player_id: string;
  kind: FormKind;
  form_id: string | null;
  answers: Answer[];
  score: number | null;
  submitted_at: string;
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  escala5: "Escala del 1 al 5",
  escala10: "Escala del 1 al 10",
  si_no: "Sí o no",
  opciones: "Elegir una opción",
  texto: "Texto corto",
};

export const KIND_LABEL: Record<FormKind, string> = { wellness: "Wellness", rpe: "RPE" };

/** Plantillas por defecto (las que ve un club que todavía no armó las suyas). */
export const DEFAULT_FORMS: Record<FormKind, { name: string; questions: Question[] }> = {
  wellness: {
    name: "Wellness básico",
    questions: [
      { id: "sueno", label: "¿Cómo dormiste?", hint: "1 = muy mal · 5 = excelente", type: "escala5", required: true },
      { id: "energia", label: "¿Cómo está tu energía?", hint: "1 = en cero · 5 = a full", type: "escala5", required: true },
      { id: "animo", label: "¿Cómo te sientes de ánimo?", hint: "1 = mal · 5 = excelente", type: "escala5", required: true },
      { id: "dolor", label: "¿Tienes molestias o dolor muscular?", hint: "1 = nada · 5 = mucho", type: "escala5", required: true, invert: true },
      { id: "estres", label: "¿Qué tan estresada estás?", hint: "1 = nada · 5 = mucho", type: "escala5", required: true, invert: true },
    ],
  },
  rpe: {
    name: "RPE del entreno",
    questions: [
      { id: "rpe", label: "¿Qué tan exigente sentiste el entreno?", hint: "1 = muy suave · 10 = al máximo", type: "escala10", required: true },
      { id: "comentario", label: "¿Algo que quieras contarle al Profe?", type: "texto", required: false },
    ],
  },
};

/** Emojis para las escalas de 1 a 5 (al revés cuando 5 es malo). */
export const EMOJIS_5 = ["😞", "😕", "😐", "🙂", "😃"];
export const EMOJIS_5_INV = ["✅", "🙂", "😐", "😣", "🤕"];

export const newQuestionId = () => Math.random().toString(36).slice(2, 10);

/**
 * Puntaje de la respuesta:
 * - Wellness: promedio de las escalas del 1 al 5 (las "invertidas" cuentan 6 − valor). 5 = está muy bien.
 * - RPE: la primera escala del 1 al 10.
 * Si no hay escalas respondidas, no hay puntaje.
 */
export function scoreOf(kind: FormKind, answers: Answer[]): number | null {
  if (kind === "rpe") {
    const a = answers.find((x) => x.type === "escala10" && typeof x.value === "number");
    return a ? (a.value as number) : null;
  }
  const vals = answers
    .filter((x) => x.type === "escala5" && typeof x.value === "number")
    .map((x) => (x.invert ? 6 - (x.value as number) : (x.value as number)));
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100;
}

/** Revisa que el formulario esté completo antes de mandarlo. Devuelve el error o null. */
export function missingAnswer(questions: Question[], values: Record<string, Answer["value"]>): string | null {
  for (const q of questions) {
    const v = values[q.id];
    if (q.required && (v == null || v === "")) return `Falta responder: "${q.label}"`;
  }
  return null;
}

/** Revisa un formulario antes de guardarlo. */
export function formProblem(name: string, questions: Question[]): string | null {
  if (!name.trim()) return "Ponle un nombre al formulario.";
  if (questions.length === 0) return "Agrega al menos una pregunta.";
  if (questions.length > 30) return "Máximo 30 preguntas.";
  for (const q of questions) {
    if (!q.label.trim()) return "Hay una pregunta sin texto.";
    if (q.type === "opciones" && (q.options ?? []).filter((o) => o.trim()).length < 2) return `"${q.label}" necesita al menos 2 opciones.`;
  }
  return null;
}

const forms = () => supabase.from("club_forms" as never) as any;
const responses = () => supabase.from("form_responses" as never) as any;

export async function listForms(clubId: string): Promise<ClubForm[]> {
  const { data, error } = await forms().select("id, club_id, kind, name, questions, is_default").eq("club_id", clubId).order("created_at");
  if (error) throw error;
  return (data ?? []) as ClubForm[];
}

/** El formulario que usa un entreno: el que eligió, o el de por defecto del club, o la plantilla. */
export function resolveForm(kind: FormKind, chosenId: string | null | undefined, clubForms: ClubForm[]): { id: string | null; name: string; questions: Question[] } {
  const f = (chosenId && clubForms.find((x) => x.id === chosenId)) || clubForms.find((x) => x.kind === kind && x.is_default);
  return f ? { id: f.id, name: f.name, questions: f.questions } : { id: null, ...DEFAULT_FORMS[kind] };
}

export async function saveForm(clubId: string, input: { name: string; kind: FormKind; questions: Question[]; is_default: boolean }, id?: string): Promise<string> {
  const problem = formProblem(input.name, input.questions);
  if (problem) throw new Error(problem);
  const clean = {
    club_id: clubId,
    kind: input.kind,
    name: input.name.trim(),
    is_default: input.is_default,
    questions: input.questions.map((q) => ({
      ...q,
      label: q.label.trim(),
      hint: q.hint?.trim() || undefined,
      options: q.type === "opciones" ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      invert: q.type === "escala5" ? !!q.invert : undefined,
    })),
  };
  // Solo uno por defecto: si este pasa a serlo, se lo quitamos al anterior.
  if (input.is_default) {
    const q = forms().update({ is_default: false }).eq("club_id", clubId).eq("kind", input.kind).eq("is_default", true);
    const { error } = await (id ? q.neq("id", id) : q);
    if (error) throw error;
  }
  if (id) {
    const { error } = await forms().update(clean).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await forms().insert(clean).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteForm(id: string): Promise<void> {
  const { error } = await forms().delete().eq("id", id);
  if (error) throw error;
}

export async function listResponses(callUpId: string): Promise<FormResponse[]> {
  const { data, error } = await responses().select("id, call_up_id, player_id, kind, form_id, answers, score, submitted_at").eq("call_up_id", callUpId);
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ ...r, score: r.score == null ? null : Number(r.score) })) as FormResponse[];
}

export async function saveResponse(input: { callUpId: string; playerId: string; kind: FormKind; formId: string | null; questions: Question[]; values: Record<string, Answer["value"]> }): Promise<void> {
  const problem = missingAnswer(input.questions, input.values);
  if (problem) throw new Error(problem);
  const answers: Answer[] = input.questions.map((q) => ({
    id: q.id, label: q.label, type: q.type, value: input.values[q.id] ?? null, ...(q.invert ? { invert: true } : {}),
  }));
  const row = {
    call_up_id: input.callUpId,
    player_id: input.playerId,
    club_id: "00000000-0000-0000-0000-000000000000", // lo pone la base desde el entreno
    kind: input.kind,
    form_id: input.formId,
    answers,
    score: scoreOf(input.kind, answers),
    submitted_at: new Date().toISOString(),
  };
  const { error } = await responses().upsert(row, { onConflict: "call_up_id,player_id,kind" });
  if (error) throw error;
}
