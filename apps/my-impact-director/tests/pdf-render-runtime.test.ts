import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PDFDocument,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
} from "pdf-lib";
import { extractPages } from "../src/lib/documents";
import { renderVisualPages } from "../src/lib/report-visual";

test("text extraction before rendering preserves scaled PDF strokes", async () => {
  const document = await PDFDocument.create();
  const page = document.addPage([300, 300]);
  page.drawText("A public report with scaled chart lines.", { size: 10 });
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(2, 0, 0, 1, 0, 0),
  );
  page.drawLine({
    start: { x: 10, y: 20 },
    end: { x: 100, y: 120 },
    thickness: 0,
  });
  page.pushOperators(popGraphicsState());
  const bytes = Buffer.from(await document.save());
  assert.equal((await extractPages(bytes)).length, 1);
  const images = await renderVisualPages(bytes, [1]);
  assert.equal(images.length, 1);
  assert.equal(images[0].page, 1);
  assert.ok(images[0].dataUrl.startsWith("data:image/png;base64,"));
  assert.ok(images[0].dataUrl.length > 1000);
});
