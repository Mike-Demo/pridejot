/**
 * Board export service.
 *
 * Renders the whiteboard element to a canvas and downloads it as a PNG or as a
 * landscape PDF page. Browser-only: the libraries touch `document`, so they are
 * imported dynamically inside each function to stay SSR-safe.
 */

/** PDF page margin, in millimetres. Document geometry, not CSS styling. */
const PDF_MARGIN_MM = 10;

/** Capture scale — 2x keeps note text crisp in print and on retina screens. */
const CAPTURE_SCALE = 2;

function timestampedName(extension: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `queerboard-${today}.${extension}`;
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

async function captureBoard(board: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas-pro");
  const backgroundColor = getComputedStyle(board).backgroundColor || "#ffffff";
  return html2canvas(board, {
    scale: CAPTURE_SCALE,
    backgroundColor,
    useCORS: true,
    logging: false,
    ignoreElements: isExportHidden,
  });
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
  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    (pageWidth - width) / 2,
    (pageHeight - height) / 2,
    width,
    height,
  );
  doc.save(timestampedName("pdf"));
}
