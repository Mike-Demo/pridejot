/* Pride palette — explicit brand colors requested for this board. */
export interface NoteColor {
  readonly name: string;
  readonly bg: string;
  readonly ink: string;
}

export const NOTE_COLORS: readonly NoteColor[] = [
  { name: "Red", bg: "#f6a9a2", ink: "#571311" },
  { name: "Orange", bg: "#f9cfa0", ink: "#5c3511" },
  { name: "Yellow", bg: "#f9e9a0", ink: "#57490e" },
  { name: "Green", bg: "#b3e3b1", ink: "#17491d" },
  { name: "Blue", bg: "#a9c9f0", ink: "#173c6b" },
  { name: "Purple", bg: "#d5b9ea", ink: "#3f2260" },
  { name: "Trans pink", bg: "#f4c3d6", ink: "#6b2140" },
  { name: "Trans blue", bg: "#b7e2f2", ink: "#124c63" },
  { name: "Brown", bg: "#d9bda6", ink: "#4b2e1b" },
  { name: "Black stripe", bg: "#c9ccd4", ink: "#20222a" },
];

export const DEFAULT_COLOR_INDEX = 6;

export function colorAt(index: number): NoteColor {
  return NOTE_COLORS[index] ?? NOTE_COLORS[DEFAULT_COLOR_INDEX]!;
}
