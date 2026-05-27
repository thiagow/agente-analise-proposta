const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (buffer.length > MAX_PDF_SIZE) {
    throw new Error("PDF excede o tamanho máximo de 10MB");
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — subpath sem declaração de tipos; tipos disponíveis via pdfjs-dist/types
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Em Node.js serverless não há worker thread de browser.
  // workerSrc vazio faz o pdfjs processar na mesma thread (FakeWorker).
  GlobalWorkerOptions.workerSrc = "";

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
