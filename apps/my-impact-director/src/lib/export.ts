import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewResult } from "./pipeline";
import { criteria, frameworkNames, ANCHORS, type Framework } from "./rubric";
export async function exportPdf(result: ReviewResult) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${result.context.organisation} — Impact report review`);
  pdf.setAuthor("My Social Impact");
  pdf.registerFontkit(fontkit);
  const [regular, bold, serif] = await Promise.all(
    ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSerif.ttf"].map(
      async (name) =>
        pdf.embedFont(
          await readFile(join(process.cwd(), "assets/fonts", name)),
          { subset: true },
        ),
    ),
  );
  const glyphs = new Map(
    [regular, bold, serif].map((font) => [
      font,
      new Set(font.getCharacterSet()),
    ]),
  );
  let substitutedCharacters = false;
  let page = pdf.addPage([595, 842]),
    y = 780;
  const ink = rgb(0.025, 0.05, 0.12),
    muted = rgb(0.34, 0.37, 0.44),
    accent = rgb(0.87, 0.2, 0.015);
  function newPage() {
    page = pdf.addPage([595, 842]);
    y = 780;
  }
  function safe(s: string, font: PDFFont) {
    return [...s]
      .map((char) => {
        if (/\s/.test(char) || glyphs.get(font)!.has(char.codePointAt(0)!))
          return char;
        substitutedCharacters = true;
        return `[U+${char.codePointAt(0)!.toString(16).toUpperCase()}]`;
      })
      .join("");
  }
  function write(
    s: string,
    size = 10,
    weight: "normal" | "bold" | "serif" = "normal",
    color = ink,
  ) {
    const font =
      weight === "bold" ? bold : weight === "serif" ? serif : regular;
    // Split unusually long tokens too, so URLs and identifiers cannot overflow.
    const words = safe(s, font)
      .split(/\s+/)
      .flatMap((word) => {
        const chunks: string[] = [];
        let chunk = "";
        for (const char of word) {
          if (chunk && font.widthOfTextAtSize(chunk + char, size) > 475) {
            chunks.push(chunk);
            chunk = "";
          }
          chunk += char;
        }
        return [...chunks, chunk];
      });
    let line = "";
    const lines: string[] = [];
    for (const word of words) {
      if (font.widthOfTextAtSize(line + " " + word, size) > 475 && line) {
        lines.push(line);
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) lines.push(line);
    for (const l of lines) {
      if (y < size + 70) newPage();
      page.drawText(l, { x: 60, y, size, font, color });
      y -= size * 1.5;
    }
    y -= 6;
  }
  const heading = (s: string) => {
    if (y < 170) newPage();
    y -= 14;
    write(s, 19, "serif");
  };
  write("MY IMPACT DIRECTOR", 11, "bold", accent);
  y -= 25;
  write("Your impact report,\nreviewed.", 34, "serif");
  y -= 15;
  write(result.context.organisation, 20, "bold");
  write(result.context.title, 13);
  write(
    `Reporting period: ${result.context.reportingPeriod || "Not identified"}`,
  );
  write(
    `Assessed ${new Date(result.assessedAt).toLocaleDateString("en-GB")} · Methodology ${result.version}`,
    9,
    "normal",
    muted,
  );
  heading("Executive summary");
  write(result.actions.summary, 11);
  for (const key of ["claims", "excellence"] as Framework[]) {
    const s = result.scores[key];
    write(
      `${frameworkNames[key]}: ${s.provisional ? "Provisional - no overall score" : s.overall + "/100"} · ${s.coverage}/20 tests assessed`,
      12,
      "bold",
    );
  }
  heading("Strengths");
  result.actions.strengths.forEach((s) => write("- " + s));
  heading("Opportunities");
  result.actions.opportunities.forEach((s) => write("- " + s));
  for (const framework of ["claims", "excellence"] as Framework[]) {
    newPage();
    write(frameworkNames[framework], 26, "serif");
    for (const p of result.scores[framework].principles) {
      heading(
        `${p.name} · ${p.score === null ? "Unassessable" : p.score + "/20"} · ${p.coverage}/4 tests`,
      );
      for (const f of p.tests) {
        write(
          criteria(framework).find((c) => c.id === f.id)!.question,
          11,
          "bold",
        );
        write(
          `${f.status.replaceAll("_", " ")} · ${f.score === null ? "No score" : f.score + "/4"} · ${f.confidence} confidence`,
          9,
          "normal",
          muted,
        );
        write(f.explanation);
        for (const e of f.evidence) write(`PDF p. ${e.page}: "${e.quote}"`, 9);
        f.limitations.forEach((l) => write("Limitation: " + l, 9));
        write("Improve: " + f.improvement, 10, "bold");
      }
    }
  }
  newPage();
  write("Material claims register", 26, "serif");
  for (const c of result.claims) {
    heading(`${c.id} · ${c.materiality} materiality`);
    write(`PDF p. ${c.page}: "${c.text}"`, 11, "bold");
    write(
      `${c.classification} · Evidence ${c.adequacy} · Exaggeration risk ${c.exaggerationRisk}`,
    );
    write(c.outcome);
    c.evidence.forEach((e) => write(`Evidence, p. ${e.page}: "${e.quote}"`, 9));
    c.assumptions.forEach((a) => write("Qualification: " + a, 9));
    if (c.defensibleWording)
      write("More defensible wording: " + c.defensibleWording);
  }
  newPage();
  write("Your prioritised action plan", 26, "serif");
  for (const [key, name] of [
    ["quick", "Quick improvements"],
    ["important", "Important reporting improvements"],
    ["longer_term", "Longer-term improvements"],
  ]) {
    heading(name);
    result.actions.actions
      .filter((a) => a.priority === key)
      .forEach((a) => {
        write(a.title, 12, "bold");
        write(a.detail);
        write(
          "Related tests: " + a.criterionIds.join(", "),
          8,
          "normal",
          muted,
        );
      });
  }
  heading("Methodology and limitations");
  write(
    "Each framework contains five principles with four tests each. Assessable tests score 0 to 4. A principle is the average of its assessable scores multiplied by 5, contributing up to 20 points. A definitive overall score needs at least 3 assessable tests in every principle and at least 16 of 20 overall. Excluded tests have explanations.",
  );
  ANCHORS.forEach((a, i) => write(`${i}: ${a}`, 9));
  result.limitations.forEach((l) => write(l, 9));
  if (substitutedCharacters)
    write(
      "Some characters are unavailable in the PDF fonts and appear as Unicode code points, for example [U+4E2D]. Consult the original report and online review for their exact appearance.",
      9,
    );
  write(
    "The Excellence review describes the report. It is separate from the full maturity assessment at socialimpactexcellence.org.",
    9,
  );
  for (const [i, p] of pdf.getPages().entries()) {
    p.drawLine({
      start: { x: 60, y: 49 },
      end: { x: 535, y: 49 },
      thickness: 0.5,
      color: rgb(0.8, 0.83, 0.81),
    });
    p.drawText("Developed by My Social Impact | Built by The Ideas Shed", {
      x: 60,
      y: 33,
      size: 8,
      font: regular,
      color: muted,
    });
    p.drawText(`${i + 1} / ${pdf.getPageCount()}`, {
      x: 495,
      y: 33,
      size: 8,
      font: regular,
      color: muted,
    });
  }
  return Buffer.from(await pdf.save());
}
