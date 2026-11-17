import { getDocumentProxy, extractText } from "unpdf";
import { PDFDocument, PDFDict, PDFArray, PDFName, PDFStream } from "pdf-lib";
import { z } from "zod";
import { structured } from "./ai";
import { type Page, pageSchema } from "./assessment";
import { AppError } from "./security";
import { MAX_FILE, MAX_FILE_LABEL } from "./file-limits";
export { MAX_FILE } from "./file-limits";
export const MAX_PAGES = 100,
  MAX_TEXT = 240000;
export async function validatePdf(bytes: Buffer, name: string) {
  if (!/\.pdf$/i.test(name) || bytes.length > MAX_FILE || bytes.length < 40)
    throw new AppError(
      400,
      `We couldn’t accept this file. Please try a complete PDF up to ${MAX_FILE_LABEL}.`,
    );
  if (
    bytes.subarray(0, 5).toString() !== "%PDF-" ||
    !bytes.subarray(-2048).includes(Buffer.from("%%EOF"))
  )
    throw new AppError(400, "This file is not a complete PDF.");
  let document: PDFDocument;
  try {
    document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
  } catch {
    throw new AppError(
      400,
      "We couldn’t read this PDF. If it needs a password, please save an unlocked copy and try again.",
    );
  }
  if (document.getPageCount() > MAX_PAGES)
    throw new AppError(
      400,
      `Please use a report with at most ${MAX_PAGES} pages.`,
    );
  // Inspect parsed names and dictionaries. Compressed image/content bytes may
  // contain arbitrary /JS-like sequences and must never be scanned as PDF syntax.
  const rejectActiveContent = () => {
    throw new AppError(
      400,
      "This PDF includes embedded scripts, files or interactive media. Please save a standard PDF copy and try again.",
    );
  };
  const names = document.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
  if (
    names?.has(PDFName.of("JavaScript")) ||
    names?.has(PDFName.of("EmbeddedFiles"))
  )
    rejectActiveContent();
  const nameOf = (dictionary: PDFDict, key: string) => {
    const value = document.context.lookup(dictionary.get(PDFName.of(key)));
    return value instanceof PDFName ? value.decodeText() : "";
  };
  const visited = new Set<unknown>();
  function inspect(object: unknown) {
    if (visited.has(object)) return;
    visited.add(object);
    if (object instanceof PDFStream) inspect(object.dict);
    else if (object instanceof PDFDict) {
      if (
        ["JavaScript", "Launch", "RichMediaExecute"].includes(
          nameOf(object, "S"),
        ) ||
        nameOf(object, "Type") === "EmbeddedFile" ||
        ["RichMedia", "FileAttachment"].includes(nameOf(object, "Subtype"))
      )
        rejectActiveContent();
      for (const [, value] of object.entries()) inspect(value);
    } else if (object instanceof PDFArray)
      for (const value of object.asArray()) inspect(value);
  }
  for (const [, object] of document.context.enumerateIndirectObjects())
    inspect(object);
}
export async function extractPages(bytes: Buffer): Promise<Page[]> {
  await validatePdf(bytes, "report.pdf");
  const pdf = await getDocumentProxy(new Uint8Array(bytes), {
    isEvalSupported: false,
    stopAtErrors: true,
  });
  try {
    if (pdf.numPages > MAX_PAGES)
      throw new AppError(
        400,
        `Please use a report with at most ${MAX_PAGES} pages.`,
      );
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = text.map((text, i) => ({
      page: i + 1,
      text,
      extraction: "text" as const,
      readable: text.trim().length >= 30,
    }));
    if (
      pages.some((p) => p.text.length > 40000) ||
      pages.reduce((n, p) => n + p.text.length, 0) > MAX_TEXT
    )
      throw new AppError(
        400,
        "This report exceeds the processing limit. Please upload a shorter report.",
      );
    return pages;
  } finally {
    await pdf.destroy();
  }
}
export const visualSchema = z
  .object({
    pages: z.array(pageSchema).max(5),
    observations: z
      .array(
        z
          .object({
            page: z.number().int().positive(),
            description: z.string().max(1800),
            limitations: z.string().max(1000),
          })
          .strict(),
      )
      .max(15),
  })
  .strict();
export async function readVisualPages(
  bytes: Buffer,
  pages: Page[],
  start: number,
) {
  const source = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
    updateMetadata: false,
  });
  const part = await PDFDocument.create();
  const indexes = pages.slice(start, start + 5).map((p) => p.page - 1);
  for (const p of await part.copyPages(source, indexes)) part.addPage(p);
  const response = await structured(
    visualSchema,
    "Transcribe the supplied PDF pages accurately, including table cells, chart labels, legends and important visual evidence. Never infer numerical values from bars without labelled values. Physical PDF page numbers in this excerpt map to original pages as supplied. Return one text entry per page using original page numbers, extraction ocr and readable true only when confidently legible. If genuinely blank, return text [Blank page], readable true. Keep actual text verbatim, with reading order; record visual descriptions separately as observations, not quotations. Explicitly record illegible elements. Do not assess or score.",
    {
      pageMapping: indexes.map((n, i) => ({ excerpt: i + 1, original: n + 1 })),
      existingText: pages.slice(start, start + 5),
    },
    Buffer.from(await part.save()),
  );
  if (
    response.data.pages.length !== indexes.length ||
    response.data.pages.some((p, i) => p.page !== indexes[i] + 1)
  )
    throw new Error("OCR page mapping mismatch.");
  return response;
}
