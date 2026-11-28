import { DOMMatrix } from "@napi-rs/canvas";

// PDF.js captures matrices when its module first loads. Install the native
// implementation before text extraction as well as rendering, so later path
// transforms never retain unpdf's incomplete Node placeholder.
if (!globalThis.DOMMatrix || !("a" in new globalThis.DOMMatrix()))
  globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;

export { getDocumentProxy } from "unpdf";
