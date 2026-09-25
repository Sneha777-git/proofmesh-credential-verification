/**
 * PDF validation shared by the browser (fast feedback) and the server (authoritative).
 * Uploads are untrusted: extension, MIME type, size and magic bytes are all checked.
 * Files are only ever read as bytes — never parsed, rendered or executed.
 */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export type PdfCheck = { ok: true } | { ok: false; code: "invalid_pdf" | "oversized_pdf" | "empty_pdf"; message: string };

const MESSAGES = {
  invalid_pdf: "This file is not a valid PDF. Upload the original credential PDF.",
  oversized_pdf: "The PDF is larger than 10 MB.",
  empty_pdf: "The file is empty.",
} as const;

const bad = (code: keyof typeof MESSAGES): PdfCheck => ({ ok: false, code, message: MESSAGES[code] });

export function validatePdf(bytes: Uint8Array, name: string, mime: string): PdfCheck {
  if (bytes.byteLength === 0) return bad("empty_pdf");
  if (bytes.byteLength > MAX_PDF_BYTES) return bad("oversized_pdf");
  if (!/\.pdf$/i.test(name)) return bad("invalid_pdf");
  if (mime && mime !== "application/pdf") return bad("invalid_pdf");
  // Magic bytes "%PDF-" within the first 1 KB (spec allows leading junk).
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!head.includes("%PDF-")) return bad("invalid_pdf");
  // A complete PDF ends with an %%EOF marker near the end.
  const tail = new TextDecoder("latin1").decode(bytes.subarray(Math.max(0, bytes.byteLength - 2048)));
  if (!tail.includes("%%EOF")) return bad("invalid_pdf");
  return { ok: true };
}

export async function validatePdfFile(file: File): Promise<PdfCheck> {
  if (file.size > MAX_PDF_BYTES) return bad("oversized_pdf");
  return validatePdf(new Uint8Array(await file.arrayBuffer()), file.name, file.type);
}

/** Message the issuer signs to authorize an IPFS upload. Contains no secrets. */
export function pinMessage(documentHash: string, wallet: string, timestamp: number) {
  return `ProofMesh IPFS upload\nDocument SHA-256: ${documentHash.toLowerCase()}\nIssuer wallet: ${wallet.toLowerCase()}\nTimestamp: ${timestamp}`;
}
