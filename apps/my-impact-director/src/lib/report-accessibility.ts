import { getDocumentProxy } from "./pdf-runtime";
export type PdfChecks = {
  kind: "report-pdf-checks-v2";
  tagged: boolean | null;
  language: string | null;
  pages: {
    page: number;
    medianTextPoints: number | null;
    smallTextFraction: number | null;
    hasStructure: boolean;
    figures: number;
    figuresWithAlt: number;
    roles: string[];
    structurePreview: { role: string; text: string; alt: string | null }[];
  }[];
  verified: string[];
  notVerified: string[];
};
/** Structural inspection only: neither a tag flag nor extracted order proves screen-reader usability. */
export async function inspectPdfChecks(
  bytes: Buffer,
  numbers: number[],
): Promise<PdfChecks> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes), {
    isEvalSupported: false,
    stopAtErrors: true,
  });
  try {
    const mark = await pdf.getMarkInfo(),
      meta = await pdf.getMetadata(),
      pages: PdfChecks["pages"] = [];
    const info = meta.info as Record<string, unknown>;
    for (const n of numbers) {
      const page = await pdf.getPage(n),
        content = await page.getTextContent({ includeMarkedContent: true }),
        tree = await page.getStructTree();
      const sizes = content.items
        .flatMap((i) =>
          "str" in i && i.str.trim()
            ? [
                {
                  size:
                    Math.round(
                      Math.hypot(i.transform[0], i.transform[1]) * 10,
                    ) / 10,
                  chars: i.str.trim().length,
                },
              ]
            : [],
        )
        .filter((i) => i.size > 0);
      sizes.sort((a, b) => a.size - b.size);
      const chars = sizes.reduce((a, i) => a + i.chars, 0);
      let count = 0,
        median: number | null = null;
      for (const i of sizes) {
        count += i.chars;
        if (count >= chars / 2) {
          median = i.size;
          break;
        }
      }
      let figures = 0,
        figuresWithAlt = 0;
      const roles = new Set<string>(),
        marked = new Map<string, string>(),
        stack: (string | undefined)[] = [];
      for (const item of content.items) {
        if ("str" in item) {
          for (const id of stack)
            if (id) marked.set(id, (marked.get(id) || "") + " " + item.str);
        } else {
          const m = item as { type: string; id?: string };
          if (m.type.startsWith("beginMarkedContent")) stack.push(m.id);
          else if (m.type === "endMarkedContent") stack.pop();
        }
      }
      const structurePreview: PdfChecks["pages"][number]["structurePreview"] =
        [];
      function visit(node: unknown): string {
        if (!node || typeof node !== "object") return "";
        const x = node as {
          role?: string;
          alt?: string;
          id?: string;
          children?: unknown[];
        };
        if (x.role) roles.add(x.role);
        if (x.role === "Figure") {
          figures++;
          if (x.alt?.trim()) figuresWithAlt++;
        }
        const text = x.id
          ? marked.get(x.id) || ""
          : (x.children || []).map(visit).join(" ");
        if (x.role && x.role !== "Root" && structurePreview.length < 60)
          structurePreview.push({
            role: x.role,
            text: text.trim().slice(0, 500),
            alt: x.alt?.slice(0, 1000) || null,
          });
        return text;
      }
      visit(tree);
      pages.push({
        page: n,
        medianTextPoints: median,
        smallTextFraction: chars
          ? Math.round(
              (sizes
                .filter((i) => i.size < 11)
                .reduce((a, i) => a + i.chars, 0) /
                chars) *
                100,
            ) / 100
          : null,
        hasStructure: !!tree,
        figures,
        figuresWithAlt,
        roles: [...roles],
        structurePreview,
      });
    }
    return {
      kind: "report-pdf-checks-v2",
      tagged: mark?.Marked ?? null,
      language: typeof info.Language === "string" ? info.Language : null,
      pages,
      verified: [
        "PDF tag flag, sampled structure roles and tagged text in structure order for comparison with page images",
        "Sampled figure-tag alternative text presence",
        "Character-weighted median extracted text size in PDF points (includes captions; not a body-text classification)",
      ],
      notVerified: [
        "Screen-reader or user testing",
        "Semantic correctness and completeness of reading order and alternatives",
        "Reflow behaviour",
        "Measured colour contrast ratios",
        "Keyboard navigation",
      ],
    };
  } finally {
    await pdf.destroy();
  }
}
