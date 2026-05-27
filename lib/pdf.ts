import { extractText, getDocumentProxy } from "unpdf";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_SIZE) {
    throw new Error("PDF excede o tamanho máximo de 10MB");
  }

  const uint8Array = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8Array);
  const { text } = await extractText(pdf, { mergePages: true });

  return text.trim();
}
