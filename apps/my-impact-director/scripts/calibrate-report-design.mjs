// Synthetic layout fixtures for renderer regression. These are not professional model calibration.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { renderVisualPages } from "../src/lib/report-visual.ts";
import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const cases = [
  "clear-designed",
  "plain-effective",
  "polished-confusing",
  "stories-weak-data",
  "dense-hierarchy",
  "short-charity",
  "complex-corporate",
  "scanned",
];
const result = [];
for (const [index, name] of cases.entries()) {
  const pdf = await PDFDocument.create(),
    font = await pdf.embedFont(StandardFonts.Helvetica);
  const total =
    name === "complex-corporate" ? 24 : name === "short-charity" ? 1 : 3;
  for (let i = 0; i < total; i++) {
    const p = pdf.addPage([595, 842]);
    if (name === "scanned") {
      const canvas = createCanvas(900, 1200),
        c = canvas.getContext("2d");
      c.fillStyle = "white";
      c.fillRect(0, 0, 900, 1200);
      c.fillStyle = "#111";
      c.font = "28px sans-serif";
      c.fillText("Scanned source: community outcomes", 40, 80);
      const img = await pdf.embedPng(canvas.toBuffer("image/png"));
      p.drawImage(img, { x: 0, y: 0, width: 595, height: 842 });
    } else {
      if (index === 0 || index === 2)
        p.drawRectangle({
          x: 0,
          y: 640,
          width: 595,
          height: 202,
          color: rgb(0.02, 0.06, 0.14),
        });
      p.drawText(name.replaceAll("-", " "), {
        x: 35,
        y: 750,
        font,
        size: 24,
        color: index === 0 || index === 2 ? rgb(1, 1, 1) : rgb(0, 0, 0),
      });
      const line =
        name === "stories-weak-data"
          ? "A participant describes a new beginning. 68 91 47 22"
          : name === "polished-confusing"
            ? "Strategic pillar synergies optimise multi-level enablement."
            : "What changed: participants described greater confidence.";
      for (let n = 0; n < (name === "dense-hierarchy" ? 45 : 12); n++)
        p.drawText(line, {
          x: 35,
          y: 610 - n * 12,
          font,
          size: name === "dense-hierarchy" ? 8 : 10,
        });
    }
  }
  const bytes = Buffer.from(await pdf.save());
  await fs.writeFile(`artifacts/ire/${name}.pdf`, bytes);
  const samples = [1, ...(total > 1 ? [total] : [])],
    images = await renderVisualPages(bytes, samples);
  assert.equal(images.length, samples.length);
  for (const image of images)
    await fs.writeFile(
      `artifacts/ire/${name}-${image.page}.png`,
      Buffer.from(image.dataUrl.split(",")[1], "base64"),
    );
  result.push({
    name,
    pages: total,
    rendered: samples,
    imageOnly: name === "scanned",
  });
}
await fs.writeFile(
  "artifacts/ire/eight-render-fixtures.json",
  JSON.stringify(result, null, 2),
);
console.log(result);
