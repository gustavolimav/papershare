export interface ExtractedPage {
  page_number: number;
  text: string;
}

export interface ExtractedText {
  pages: ExtractedPage[];
  fullText: string;
}

// PDF-only for this pass — DOCX/PPTX text extraction (e.g. via `mammoth`)
// is a reasonable future addition, scoped out here the same way logo
// upload was scoped out of custom branding: callers treat `null` as
// "extraction not supported for this file", not an error.
export async function extractText(
  mimeType: string,
  fileBuffer: Buffer,
): Promise<ExtractedText | null> {
  if (mimeType !== "application/pdf") {
    return null;
  }

  // Same defensive probe as extractPageCount() in
  // pages/api/v1/documents/index.ts: pdf-parse's legacy pdfjs-dist build
  // needs @napi-rs/canvas's native binary to polyfill browser canvas
  // globals, and when it's unavailable the internal failure isn't reliably
  // catchable around the awaited call — so skip extraction entirely rather
  // than risk it.
  try {
    await import("@napi-rs/canvas");
  } catch {
    return null;
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: fileBuffer });

    try {
      const result = await parser.getText();
      return {
        pages: result.pages.map((page) => ({
          page_number: page.num,
          text: page.text,
        })),
        fullText: result.text,
      };
    } finally {
      await parser.destroy();
    }
  } catch {
    return null;
  }
}
