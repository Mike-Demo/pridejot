import { supabase } from "@/integrations/supabase/client";

/**
 * Data access for shared boards. Boards are public by design: anyone holding
 * the link may read and edit the notes until the board expires.
 */

export interface Board {
  readonly id: string;
  readonly code: string;
  readonly expires_at: string;
}

export interface BoardNote {
  readonly id: string;
  readonly board_id: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
  readonly color_index: number;
  readonly text: string;
  readonly hearts: number;
}

/* Unambiguous alphabet — no O/0, I/1 confusion when a code is read aloud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function createBoard(): Promise<Board> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("boards")
      .insert({ code: randomCode() })
      .select("id, code, expires_at")
      .single();
    if (!error && data) return data;
    /* 23505 = unique violation: the generated code was taken, try another. */
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not start a new board");
}

export async function getBoardByCode(code: string): Promise<Board | null> {
  const { data, error } = await supabase
    .from("boards")
    .select("id, code, expires_at")
    .eq("code", normalizeCode(code))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listNotes(boardId: string): Promise<BoardNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, board_id, x, y, rotation, color_index, text, hearts")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertNote(
  note: Omit<BoardNote, "id"> & { readonly id?: string },
): Promise<BoardNote> {
  const { data, error } = await supabase
    .from("notes")
    .insert(note)
    .select("id, board_id, x, y, rotation, color_index, text, hearts")
    .single();
  if (error) throw error;
  return data;
}

export async function patchNote(
  id: string,
  patch: Partial<Pick<BoardNote, "x" | "y" | "text" | "hearts">>,
): Promise<void> {
  const { error } = await supabase.from("notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}

export async function clearBoardNotes(boardId: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("board_id", boardId);
  if (error) throw error;
}
