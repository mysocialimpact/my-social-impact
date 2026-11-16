import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReviewResult } from "./pipeline";
import { criteria, frameworkNames, ANCHORS, type Framework } from "./rubric";
export async function exportPdf(result: ReviewResult) {
  const sourceIndex = new Map<string, string>();
  const sources: { id: string; page: number; quote: string }[] = [];
  function sourceRef(page: number, quote: string) {
    const key = page + "\u0000" + quote;
    let id = sourceIndex.get(key);
    if (!id) {
      id = "E" + (sources.length + 1);
      sourceIndex.set(key, id);
      sources.push({ id, page, quote });
    }
    return `${id} · PDF p. ${page}`;
  }
  const pdf = await PDFDocument.create();
  pdf.setTitle(
    `${result.context.organisation} — ${result.framework ? frameworkNames[result.framework] : "Impact report review"}`,
  );
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
  const logo = await pdf.embedPng(
    await readFile(join(process.cwd(), "public/brand/my-impact-director.png")),
  );
  const logoHeight = (220 * logo.height) / logo.width;
  page.drawImage(logo, {
    x: 55,
    y: 795 - logoHeight,
    width: 220,
    height: logoHeight,
  });
  y = 770 - logoHeight;
  if (result.framework === "report") {
    const frameworkLogo = await pdf.embedPng(
      await readFile(
        join(
          process.cwd(),
          "public/brand/impact-report-excellence-horizontal.png",
        ),
      ),
    );
    page.drawImage(frameworkLogo, {
      x: 325,
      y: 795 - 60,
      width: 220,
      height: 55,
    });
  }
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
  for (const key of (["claims", "excellence", "report"] as Framework[]).filter(
    (f) => !!result.scores[f],
  )) {
    const s = result.scores[key]!;
    write(
      `${frameworkNames[key]}: ${s.provisional ? "Provisional - no overall score" : s.overall + "/100"} · ${s.coverage}/${criteria(key).length} tests assessed`,
      12,
      "bold",
    );
  }
  heading("Strengths");
  result.actions.strengths.forEach((s) => write("- " + s));
  heading("Opportunities");
  result.actions.opportunities.forEach((s) => write("- " + s));
  for (const framework of (
    ["claims", "excellence", "report"] as Framework[]
  ).filter((f) => !!result.scores[f])) {
    newPage();
    write(frameworkNames[framework], 26, "serif");
    for (const p of result.scores[framework]!.principles) {
      heading(
        `${p.name} · ${p.score === null ? "Unassessable" : p.score + "/20"} · ${p.coverage}/${framework === "report" ? 5 : 4} tests`,
      );
      for (const f of p.tests) {
        if (f.visualPages?.length)
          write(
            `Visual observations: physical PDF pages ${f.visualPages.join(", ")}`,
          );
        write(
          `${f.id} · ${criteria(framework).find((c) => c.id === f.id)!.question}`,
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
        if (f.evidence.length)
          write(
            "Source evidence: " +
              f.evidence.map((e) => sourceRef(e.page, e.quote)).join("; "),
            9,
            "normal",
            accent,
          );
        f.limitations.forEach((l) => write("Limitation: " + l, 9));
        write("Improve: " + f.improvement, 10, "bold");
      }
    }
  }
  newPage();
  if (result.visualInspection) {
    write("Visual inspection coverage", 20, "bold");
    write(
      `Rendered at ${result.visualInspection.resolution}px width. Physical pages inspected: ${result.visualInspection.pages.join(", ")} of ${result.visualInspection.totalPages}. Representative sampling does not verify unseen pages.`,
    );
    for (const o of result.visualInspection.observations)
      write(`PDF page ${o.page}: ${o.description} ${o.limitations}`);
    write("Suggested creative direction", 20, "bold");
    write(result.creativeDirection || result.actions.actions.at(-1)!.detail);
  }
  write("Material claims register", 26, "serif");
  for (const c of result.claims) {
    heading(`${c.id} · ${c.materiality} materiality`);
    write("Claim passage: " + sourceRef(c.page, c.text), 11, "bold");
    write(
      `${c.classification} · Evidence ${c.adequacy} · Exaggeration risk ${c.exaggerationRisk}`,
    );
    write(c.outcome);
    if (c.evidence.length)
      write(
        "Supporting evidence: " +
          c.evidence.map((e) => sourceRef(e.page, e.quote)).join("; "),
        9,
      );
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
    result.framework === "report"
      ? "Impact Report Excellence Methodology v1.0: five equally weighted pillars, each with five criteria scoring 0–4. Each pillar normalises assessable criteria to 20. A definitive overall score requires four assessable criteria per pillar and 22 overall, with actual visual inspection. Creative judgement is indicative, not accreditation."
      : "Each framework contains five principles with four tests each. Assessable tests score 0 to 4. A principle is the average of its assessable scores multiplied by 5, contributing up to 20 points. A definitive overall score needs at least 3 assessable tests in every principle and at least 16 of 20 overall. Excluded tests have explanations.",
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
  if (sources.length) {
    newPage();
    write("Source evidence", 26, "serif");
    write(
      "Each reference below contains the full verbatim passage cited in the findings and material claims register. Repeated references share the same passage. Page numbers refer to the original PDF, not this assessment. Check the original document before relying on a finding.",
      10,
    );
    for (const source of sources) {
      heading(`${source.id} · PDF p. ${source.page}`);
      write(source.quote, 9);
    }
  }
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
