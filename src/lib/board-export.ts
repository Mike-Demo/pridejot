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

/** Pride flag stripe colors used for the exported header band. */
const PRIDE_STRIPES = ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"];

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

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, framed.width, framed.height);

  const stripeWidth = framed.width / PRIDE_STRIPES.length;
  PRIDE_STRIPES.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(index * stripeWidth, 0, Math.ceil(stripeWidth), bandHeight);
  });

  const titleSize = Math.round((headerHeight - bandHeight) * 0.42);
  const baseline = bandHeight + (headerHeight - bandHeight) / 2 + titleSize / 3;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#2b2b2f";
  ctx.font = `600 ${titleSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillText("Queerboard", titleSize, baseline);

  const captionSize = Math.round(titleSize * 0.55);
  const caption = formattedDate();
  ctx.font = `400 ${captionSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = "#6b6b74";
  ctx.textAlign = "right";
  ctx.fillText(caption, framed.width - titleSize, baseline);
  ctx.textAlign = "left";

  ctx.drawImage(board, 0, headerHeight);
  return framed;
}

async function captureBoard(board: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas-pro");
  const backgroundColor = getComputedStyle(board).backgroundColor || "#ffffff";
  const canvas = await html2canvas(board, {
    scale: CAPTURE_SCALE,
    backgroundColor,
    useCORS: true,
    logging: false,
    ignoreElements: isExportHidden,
  });
  return frameCapture(canvas);
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
    (pageHeight - height) / 2,
    width,
    height,
  );
  doc.save(timestampedName("pdf"));
}
