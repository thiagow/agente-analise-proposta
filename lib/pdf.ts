const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_SIZE) {
    throw new Error("PDF excede o tamanho máximo de 10MB");
  }
  // pdf-parse v2.x uses a class-based API
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text.trim();
}
