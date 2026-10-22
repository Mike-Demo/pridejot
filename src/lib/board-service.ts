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
    const { data, error } = await supabase.rpc("board_create", { p_code: randomCode() }).single();
    if (!error && data) return data;
    /* 23505 = unique violation: the generated code was taken, try another. */
    if (error && error.code !== "23505") throw error;
  }
  throw new Error("Could not start a new board");
}

export async function getBoardByCode(code: string): Promise<Board | null> {
  const { data, error } = await supabase
    .rpc("board_get_by_code", { p_code: normalizeCode(code) })
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listNotes(boardId: string, code: string): Promise<BoardNote[]> {
  const { data, error } = await supabase.rpc("board_list_notes", {
    p_board_id: boardId,
    p_code: code,
  });
  if (error) throw error;
  return data ?? [];
}

export async function insertNote(
  code: string,
  note: Omit<BoardNote, "id"> & { readonly id?: string },
): Promise<BoardNote> {
  const { data, error } = await supabase
    .rpc("board_insert_note", {
      p_code: code,
      p_board_id: note.board_id,
      p_id: note.id ?? null,
      p_x: note.x,
      p_y: note.y,
      p_rotation: note.rotation,
      p_color_index: note.color_index,
      p_text: note.text,
      p_hearts: note.hearts,
    })
    .single();
  if (error) throw error;
  return data;
}

export async function patchNote(
  code: string,
  id: string,
  patch: Partial<Pick<BoardNote, "x" | "y" | "text" | "hearts">>,
): Promise<void> {
  const { error } = await supabase.rpc("board_update_note", {
    p_code: code,
    p_note_id: id,
    p_x: patch.x ?? null,
    p_y: patch.y ?? null,
    p_text: patch.text ?? null,
    p_hearts: patch.hearts ?? null,
  });
  if (error) throw error;
}

export async function deleteNote(code: string, id: string): Promise<void> {
  const { error } = await supabase.rpc("board_delete_note", { p_code: code, p_note_id: id });
  if (error) throw error;
}

export async function clearBoardNotes(boardId: string, code: string): Promise<void> {
  const { error } = await supabase.rpc("board_clear_notes", { p_board_id: boardId, p_code: code });
  if (error) throw error;
}
