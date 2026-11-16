import fontkit from "@pdf-lib/fontkit";
/** Deliberately authored, fictional communication fixtures. No AI or email calls. */
import {
  PDFDocument,
  rgb,
  PDFName,
  PDFNumber,
  PDFString,
  PDFOperator,
  PDFOperatorNames,
  type PDFRef,
} from "pdf-lib";
import fs from "node:fs/promises";
const directory = "artifacts/impact-edit-v2";
await fs.mkdir(directory, { recursive: true });
for (const designed of [true, false]) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(
      await fs.readFile("assets/fonts/DejaVuSans.ttf"),
    ),
    bold = await pdf.embedFont(
      await fs.readFile("assets/fonts/DejaVuSans-Bold.ttf"),
    ),
    name = designed ? "excellent-designed" : "simple-effective",
    kids: PDFRef[] = [];
  const root = pdf.context.register(
    pdf.context.obj({ Type: "StructTreeRoot", K: [] }),
  );
  pdf.catalog.set(PDFName.of("StructTreeRoot"), root);
  pdf.catalog.set(PDFName.of("MarkInfo"), pdf.context.obj({ Marked: true }));
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("en-GB"));
  const parentEntries: { index: number; refs: PDFRef[] }[] = [];
  let pageIndex = 0;
  const navy = rgb(0.035, 0.08, 0.16),
    accent = designed ? rgb(0.0, 0.32, 0.4) : navy;
  function page(title: string) {
    const p = pdf.addPage([595, 842]);
    p.node.set(PDFName.of("StructParents"), PDFNumber.of(pageIndex));
    const refs: PDFRef[] = [];
    let mcid = 0;
    parentEntries.push({ index: pageIndex, refs });
    pageIndex++;
    function text(
      str: string,
      x: number,
      y: number,
      size = 12,
      weight = false,
      role = "P",
      colour = navy,
    ) {
      const id = mcid++;
      p.pushOperators(
        PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
          PDFName.of(role),
          pdf.context.obj({ MCID: id }).toString(),
        ]),
      );
      p.drawText(str, {
        x,
        y,
        size,
        font: weight ? bold : font,
        color: colour,
        lineHeight: size * 1.5,
        maxWidth: 495,
      });
      p.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
      const ref = pdf.context.register(
        pdf.context.obj({
          Type: "StructElem",
          S: role,
          P: root,
          Pg: p.ref,
          K: id,
        }),
      );
      kids.push(ref);
      refs.push(ref);
    }
    text("FICTIONAL CALIBRATION FIXTURE / 2025", 50, 800, 9, true);
    text(title, 50, 746, designed ? 34 : 25, true, "H1");
    p.pushOperators(
      PDFOperator.of(PDFOperatorNames.BeginMarkedContent, [
        PDFName.of("Artifact"),
      ]),
    );
    p.drawText(`Community Home Support | ${pageIndex}`, {
      x: 50,
      y: 32,
      size: 10,
      font,
      color: navy,
    });
    p.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
    return { p, text };
  }
  {
    const { p, text } = page("More secure homes.");
    text("2025 outcomes. In two minutes.", 50, 692, 18, true, "H2");
    if (designed)
      p.drawRectangle({ x: 50, y: 503, width: 495, height: 148, color: navy });
    const colour = designed ? rgb(1, 1, 1) : navy;
    text("312 of 400", 70, 597, designed ? 42 : 25, true, "P", colour);
    text(
      "responding households were stably housed after six months.",
      70,
      556,
      12,
      false,
      "P",
      colour,
    );
    text(
      "78% | 400 responses from 480 supported households",
      70,
      530,
      11,
      false,
      "P",
      colour,
    );
    text("What changed", 50, 460, 18, true, "H2");
    text(
      "We paired housing advice with practical support. Stable housing rose\nfrom 52% at entry to 78% at six months among respondents.",
      50,
      427,
    );
    text("What we cannot conclude", 50, 355, 18, true, "H2");
    text(
      "80 households did not respond. There was no comparison group.\nWe cannot attribute all improvement to our service.",
      50,
      322,
    );
    text("What happens next", 50, 250, 18, true, "H2");
    text(
      "By June 2026 we will add evening appointments and contact nonresponders.\nWe will publish follow-up coverage and outcomes again in December.",
      50,
      217,
    );
    text(
      "Source: fictional service register and six-month survey, Jan-Dec 2025.",
      50,
      135,
      10,
    );
    text(
      "Read on: evidence and limits / one household / decisions and access.",
      50,
      105,
      10,
    );
  }
  {
    const { p, text } = page("Evidence you can read.");
    text("Housing stability among 400 respondents", 50, 680, 19, true, "H2");
    if (designed) {
      for (const [label, value, y] of [
        ["At entry", 52, 590],
        ["Six months", 78, 505],
      ] as const) {
        text(`${label}: ${value}%`, 50, y + 26, 13, true);
        p.drawRectangle({
          x: 50,
          y: y - 15,
          width: (440 * value) / 100,
          height: 28,
          color: accent,
        });
      }
    } else {
      text("At entry                 208 of 400 (52%)", 50, 602, 14, true);
      text("At six months        312 of 400 (78%)", 50, 552, 14, true);
    }
    text(
      "A 26 percentage-point increase among respondents.",
      50,
      442,
      15,
      true,
    );
    text("Base and period", 50, 382, 18, true, "H2");
    text(
      "Base: the same 400 households responding at entry and six months.\nPeriod: support received January-December 2025.\nCoverage: 400/480 households (83%). Values are fictional.",
      50,
      350,
    );
    text("Interpret with care", 50, 251, 18, true, "H2");
    text(
      "Nonresponse may bias this result. The comparison is not causal.\nSource: fictional service register and matched follow-up survey.\nThe complete values appear in text above; colour carries no unique meaning.",
      50,
      218,
    );
  }
  {
    const { text } = page("One household. Wider limits.");
    text(
      "A specific experience, not a typical-outcome claim",
      50,
      682,
      17,
      true,
      "H2",
    );
    text(
      "Alex, a fictional participant, was facing eviction after a rent dispute.\nAn adviser helped document arrears, contact the landlord and arrange\na payment plan. Six months later Alex remained in the same home.\nAlex also received support from family and a local benefits adviser.",
      50,
      641,
    );
    text(
      "The example shows how practical advice can help. It does not establish\nthat every household had the same experience or that we caused the change.\nNo real participant or personal information is represented here.",
      50,
      525,
    );
    text("Where we fell short", 50, 419, 18, true, "H2");
    text(
      "Evening appointment waits reached 23 days. Twenty-eight respondents\nsaid our letters were confusing. We rewrote the letters and tested them\nwith six volunteers; a broader usability check is still needed.",
      50,
      385,
    );
    text(
      "A clear narrative has room for unsuccessful experiences.",
      50,
      280,
      15,
      true,
    );
  }
  {
    const { text } = page("Decisions. Access. Next steps.");
    text("Three decisions for 2026", 50, 682, 18, true, "H2");
    text(
      "1. Add evening advice appointments by June; owner: service lead.\n2. Follow up 80 nonresponders; report response coverage in December.\n3. Test rewritten letters with a wider group by September.",
      50,
      642,
    );
    text("Accessible publication", 50, 525, 18, true, "H2");
    text(
      "The document contains selectable 12-point text in logical tagged order.\nAll data have complete textual equivalents. Meaning does not depend\non colour. There are no essential photographs requiring descriptions.\nA reflowable text edition and a large-print version are available on request.",
      50,
      485,
    );
    text("Testing limits", 50, 355, 18, true, "H2");
    text(
      "This is a review fixture, not an accessibility certification. No screen-reader\nuser test has been performed; assistive usability must remain unassessable.",
      50,
      315,
    );
    text("Contact and method", 50, 235, 18, true, "H2");
    text(
      "Fictional contact: access@example.invalid. This address is not monitored.\nAll names, outcomes and programme facts in this fixture are invented.\nPurpose: compare clear designed and simple effective communication.",
      50,
      195,
    );
  }
  const nums = pdf.context.obj([]);
  for (const e of parentEntries) {
    nums.push(PDFNumber.of(e.index));
    nums.push(pdf.context.obj(e.refs));
  }
  const parentTree = pdf.context.register(pdf.context.obj({ Nums: nums }));
  const rootObj = pdf.context.lookup(root) as import("pdf-lib").PDFDict;
  rootObj.set(PDFName.of("K"), pdf.context.obj(kids));
  rootObj.set(PDFName.of("ParentTree"), parentTree);
  rootObj.set(PDFName.of("ParentTreeNextKey"), PDFNumber.of(pageIndex));
  pdf.setTitle(`${name} - fictional calibration report`);
  await fs.writeFile(`${directory}/${name}.pdf`, await pdf.save());
  console.log({ name, pages: pdf.getPageCount() });
}
