/** Controlled fictional comparisons; not independent human calibration or real charities. */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs/promises";
const dir = "artifacts/assessment-quality/sources";
await fs.mkdir(dir, { recursive: true });
for (const kind of [
  "attractive-confusing",
  "dense-poor-hierarchy",
  "strong-data",
  "weak-data",
]) {
  const pdf = await PDFDocument.create(),
    regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.04, 0.08, 0.17),
    orange = rgb(0.95, 0.28, 0.08);
  for (let i = 0; i < 2; i++) {
    const p = pdf.addPage([595, 842]);
    const text = (s: string, x: number, y: number, size = 12, b = false) =>
      p.drawText(s, {
        x,
        y,
        size,
        font: b ? bold : regular,
        color: navy,
        maxWidth: 495,
        lineHeight: size * 1.5,
      });
    text("FICTIONAL CALIBRATION COMPARISON / 2025", 45, 805, 9, true);
    if (kind === "dense-poor-hierarchy") {
      text("Community housing programme annual report", 45, 770, 13, true);
      const paragraph =
        "The organisation continued its multi-stakeholder implementation of holistic housing interventions throughout the reporting period. In the context of ongoing delivery, the programme supported 480 households and recorded stable housing for 312 of 400 respondents after six months, against 208 of 400 at entry. Eighty households did not respond. These findings are observational and do not demonstrate causation. Administration and referral processes were reviewed through ongoing programme governance and operational delivery arrangements. ";
      text(Array.from({ length: 9 }, () => paragraph).join("\n\n"), 45, 740, 8);
    } else {
      p.drawRectangle({
        x: 45,
        y: 680,
        width: 505,
        height: 94,
        color: kind === "attractive-confusing" ? orange : rgb(0.93, 0.95, 0.97),
      });
      text(
        kind === "attractive-confusing"
          ? i
            ? "THE NEXT CHAPTER"
            : "BOUNDLESS POSSIBILITY"
          : i
            ? "What we learned. What comes next."
            : "More secure homes. Clear results.",
        60,
        731,
        kind === "attractive-confusing" ? 25 : 22,
        true,
      );
      text(
        kind === "attractive-confusing"
          ? "Our journey of transformation, innovation and possibility."
          : "2025 | Community Housing Support | Six-month outcomes",
        60,
        698,
        11,
      );
      if (kind === "attractive-confusing") {
        for (let j = 0; j < 4; j++) {
          p.drawRectangle({
            x: 45 + (j % 2) * 260,
            y: 440 - Math.floor(j / 2) * 210,
            width: 245,
            height: 170,
            color: j % 2 ? rgb(0.92, 0.95, 0.99) : rgb(0.98, 0.92, 0.88),
          });
          text(
            ["80%", "312", "52%", "480"][j],
            60 + (j % 2) * 260,
            543 - Math.floor(j / 2) * 210,
            42,
            true,
          );
          text(
            [
              "A movement without limits.",
              "Making a difference.",
              "Delivering possibility.",
              "A future to believe in.",
            ][j],
            60 + (j % 2) * 260,
            495 - Math.floor(j / 2) * 210,
            10,
          );
        }
        text(
          "Together we continue to transform and innovate across an evolving ecosystem.\nOur activities create meaningful opportunities and unlock shared potential.\nWe move forward with confidence and ambition.",
          45,
          120,
          12,
        );
      } else if (!i) {
        text(
          "Stable housing rose from 52% to 78% among respondents.",
          45,
          635,
          17,
          true,
        );
        text(
          "We paired housing advice with practical support for 480 households.\n400 households responded at entry and six months; 80 did not respond.\nThe comparison is observational, not proof our support caused the change.",
          45,
          595,
          12,
        );
        const vals = [52, 78];
        if (kind === "strong-data") {
          text(
            "Stably housed households / same 400 respondents",
            45,
            500,
            15,
            true,
          );
          vals.forEach((v, j) => {
            text(j ? "Six months" : "At entry", 45, 450 - j * 90, 12, true);
            p.drawRectangle({
              x: 160,
              y: 435 - j * 90,
              width: v * 4,
              height: 32,
              color: j ? orange : navy,
            });
            text(
              `${v}% (${j ? 312 : 208}/400)`,
              165 + v * 4,
              447 - j * 90,
              11,
              true,
            );
          });
          text("0%", 160, 305, 10);
          text("100%", 530, 305, 10);
          text(
            "Source: fictional programme housing survey, 2025. Same respondents\nat entry and six months. Non-response may affect the overall picture.",
            45,
            255,
            11,
          );
        } else {
          text("Our performance", 45, 500, 15, true);
          vals.forEach((v, j) => {
            p.drawEllipse({
              x: 180 + j * 220,
              y: 390,
              xScale: 94,
              yScale: 60,
              color: j ? orange : navy,
            });
            p.drawEllipse({
              x: 180 + j * 220,
              y: 415,
              xScale: 94,
              yScale: 60,
              color: j ? rgb(1, 0.6, 0.3) : rgb(0.5, 0.6, 0.8),
            });
            text(`${v}`, 155 + j * 220, 414, 22, true);
          });
          text("The figures above show our results.", 45, 275, 11);
        }
      } else {
        text(
          "Housing improved; financial security did not.",
          45,
          620,
          20,
          true,
        );
        text(
          "Financial security rose only from 40% to 42%. Waiting times increased.\nThe team will shorten referrals and review both measures in June 2026.",
          45,
          575,
          12,
        );
        text("A household perspective", 45, 480, 17, true);
        text(
          '"Advice helped me keep my tenancy, but bills are still difficult."\nA fictional participant, anonymised. This example is not representative\nof every household; the survey describes the wider pattern.',
          45,
          440,
          12,
        );
        text("Next steps", 45, 325, 17, true);
        text(
          "The programme lead will trial faster referrals from January 2026.\nWe will publish waiting times and follow-up findings in June.\nThese findings do not establish causation or describe non-respondents.",
          45,
          285,
          12,
        );
      }
    }
    text(`Fictional comparison | ${kind} | ${i + 1}`, 45, 25, 9);
  }
  await fs.writeFile(`${dir}/${kind}.pdf`, await pdf.save());
}
console.log("Created four controlled comparison PDFs.");
