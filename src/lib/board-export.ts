/**
 * Board export service.
 *
 * Renders the whiteboard element to a canvas, frames it with a pride header
 * band and caption, then downloads it as a PNG or as a landscape PDF page.
 * Browser-only: the libraries touch `document`, so they are imported
 * dynamically inside each function to stay SSR-safe.
 */

/** PDF page margin, in millimetres. Document geometry, not CSS styling. */
const PDF_MARGIN_MM = 10;

/** Capture scale — 2x keeps note text crisp in print and on retina screens. */
const CAPTURE_SCALE = 2;

/**
 * Design-system tokens the canvas needs as concrete values. The 2D canvas API
 * cannot read CSS variables, so they are resolved from the document at export
 * time rather than hardcoded.
 */
const STRIPE_TOKENS = [
  "--wa-color-red-50",
  "--wa-color-orange-50",
  "--wa-color-yellow-50",
  "--wa-color-green-50",
  "--wa-color-blue-50",
  "--wa-color-purple-50",
];

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function tokenPx(name: string, fallback: number): number {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.width = `var(${name})`;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width > 0 ? width : fallback;
}


function timestampedName(extension: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `queerboard-${today}.${extension}`;
}

function formattedDate(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function download(blobUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
}

function isExportHidden(element: Element): boolean {
  return element instanceof HTMLElement && element.hasAttribute("data-export-hide");
}

/** Frames the raw board capture with a rainbow band, title and date caption. */
function frameCapture(board: HTMLCanvasElement): HTMLCanvasElement {
  const bandHeight = Math.round(board.height * 0.012) + 6;
  const headerHeight = Math.round(board.height * 0.07) + bandHeight;
  const framed = document.createElement("canvas");
  framed.width = board.width;
  framed.height = board.height + headerHeight;
  const ctx = framed.getContext("2d");
  if (!ctx) return board;

  const fontFamily = token("--wa-font-family-body", "system-ui, sans-serif");

  ctx.fillStyle = token("--wa-color-surface-default", "white");
  ctx.fillRect(0, 0, framed.width, framed.height);

  const stripes = STRIPE_TOKENS.map((name) => token(name, "currentColor"));
  const stripeWidth = framed.width / stripes.length;
  stripes.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index * stripeWidth, 0, Math.ceil(stripeWidth), bandHeight);
  });

  const titleSize = Math.round((headerHeight - bandHeight) * 0.42);
  const baseline = bandHeight + (headerHeight - bandHeight) / 2 + titleSize / 3;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = token("--wa-color-neutral-90", "black");
  ctx.font = `${token("--wa-font-weight-semibold", "600")} ${titleSize}px ${fontFamily}`;
  ctx.fillText("Queerboard", titleSize, baseline);

  const captionSize = Math.round(titleSize * 0.55);
  const caption = formattedDate();
  ctx.font = `${token("--wa-font-weight-normal", "400")} ${captionSize}px ${fontFamily}`;
  ctx.fillStyle = token("--wa-color-neutral-60", "gray");
  ctx.textAlign = "right";
  ctx.fillText(caption, framed.width - titleSize, baseline);
  ctx.textAlign = "left";

  ctx.drawImage(board, 0, headerHeight);
  return framed;
}

/** Empty margin kept around the notes when cropping, from the spacing scale. */
const CROP_PADDING_TOKEN = "--wa-space-3xl";

/**
 * Crops the capture to the area the notes actually occupy, so an export is not
 * mostly blank board. Returns the canvas unchanged when the board is empty.
 */
function cropToNotes(canvas: HTMLCanvasElement, board: HTMLElement): HTMLCanvasElement {
  const notes = Array.from(board.querySelectorAll<HTMLElement>(".pride-note"));
  if (notes.length === 0) return canvas;

  const boardRect = board.getBoundingClientRect();
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = 0;
  let bottom = 0;
  for (const note of notes) {
    const rect = note.getBoundingClientRect();
    left = Math.min(left, rect.left - boardRect.left);
    top = Math.min(top, rect.top - boardRect.top);
    right = Math.max(right, rect.right - boardRect.left);
    bottom = Math.max(bottom, rect.bottom - boardRect.top);
  }

  const padding = tokenPx(CROP_PADDING_TOKEN, 48);
  const x = Math.max(0, Math.floor((left - padding) * CAPTURE_SCALE));
  const y = Math.max(0, Math.floor((top - padding) * CAPTURE_SCALE));
  const width = Math.min(canvas.width - x, Math.ceil((right - left + padding * 2) * CAPTURE_SCALE));
  const height = Math.min(canvas.height - y, Math.ceil((bottom - top + padding * 2) * CAPTURE_SCALE));
  if (width <= 0 || height <= 0) return canvas;

  const cropped = document.createElement("canvas");
  cropped.width = width;
  cropped.height = height;
  const ctx = cropped.getContext("2d");
  if (!ctx) return canvas;
  ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  return cropped;
}

async function captureBoard(board: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas-pro");
  const backgroundColor =
    getComputedStyle(board).backgroundColor || token("--wa-color-surface-default", "white");
  const canvas = await html2canvas(board, {
    scale: CAPTURE_SCALE,
    backgroundColor,
    useCORS: true,
    logging: false,
    ignoreElements: isExportHidden,
  });
  return frameCapture(cropToNotes(canvas, board));
}

export async function exportBoardAsPng(board: HTMLElement): Promise<void> {
  const canvas = await captureBoard(board);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/png"),
  );
  if (!blob) throw new Error("Could not create the image file.");
  const url = URL.createObjectURL(blob);
  try {
    download(url, timestampedName("png"));
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export async function exportBoardAsPdf(board: HTMLElement): Promise<void> {
  const canvas = await captureBoard(board);
  const { jsPDF } = await import("jspdf");

  /* A4 landscape, in millimetres. */
  const pageWidth = 297;
  const pageHeight = 210;
  const maxWidth = pageWidth - PDF_MARGIN_MM * 2;
  const maxHeight = pageHeight - PDF_MARGIN_MM * 2;
  const ratio = canvas.width / canvas.height;

  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  /* JPEG keeps the printable file small; the board art is flat color, so the
     quality loss is not visible at print resolution. */
  doc.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    (pageWidth - width) / 2,
    PDF_MARGIN_MM,
    width,
    height,
  );
  doc.save(timestampedName("pdf"));
}
