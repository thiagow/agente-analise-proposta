import path from "path";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_SIZE) {
    throw new Error("PDF excede o tamanho máximo de 10MB");
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — subpath sem declaração de tipos no pdfjs-dist v5
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs-dist v5 requer workerSrc explícito — aponta para o worker local.
  // Em serverless (Netlify), o pdfjs-dist é external, então node_modules existe.
  const workerPath = path.resolve(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

  const uint8Array = new Uint8Array(buffer);
  const pdf = await getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = (textContent.items as any[])
      .filter((item) => typeof item.str === "string")
      .map((item) => item.str as string)
      .join(" ");
    pages.push(pageText);
    page.cleanup();
  }

  await pdf.destroy();
  return pages.join("\n").trim();
}
