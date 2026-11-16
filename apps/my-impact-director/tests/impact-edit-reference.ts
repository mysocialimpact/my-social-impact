/** Assistant-authored reference judgements after offline page inspection; not AI assessments or independent professional calibration. */
export const referenceCases = [
  {
    name: "profit-impact",
    oldSource:
      "Stored production review 8dcde927-1102-4be7-9c60-4fdd80084426; 84/100; identical PDF SHA-256",
    old: [
      [3, 4, 4, 4, 3],
      [3, 3, 3, 4, 4],
      [3, 3, 4, 3, 3],
      [4, 3, 4, 3, 3],
      [4, 2, 4, 3, 3],
    ],
    scores: [
      [1, 2, 3, 1, 2],
      [2, 1, 1, 3, 2],
      [1, 2, 2, 2, 1],
      [1, 1, 1, 1, 2],
      [1, 2, 2, 1, null],
    ],
    notes: [
      [
        2,
        "Most body text is 10 points; dense paragraphs and the small risk table strain ordinary-size reading (pp. 2–3, 17).",
      ],
      [
        3,
        "The summary contains useful substance but lengthy contextual material competes with the achieved outcomes.",
      ],
      [
        1,
        "A useful contents list and meaningful section headings genuinely help navigation; physical PDF numbering differs normally from printed pagination.",
      ],
      [
        3,
        "The opening foregrounds mission, a 2050 ambition and background research rather than a compact account of achieved outcomes and caveats.",
      ],
      [
        4,
        "Sections and numbered lists are usable; the reader still has to assemble the headline findings across several pages.",
      ],
      [
        5,
        "The domino strategy connects purpose and activity, but the route to demonstrated outcomes is harder to follow.",
      ],
      [
        18,
        "Authentic customer and team voices are present; most are brief praise rather than developed experiences (pp. 18–20).",
      ],
      [
        18,
        "Human material arrives late and is loosely connected to the main performance figures.",
      ],
      [
        16,
        "The risks and weaknesses discussion is candid and substantive; improvement sections on pp. 8, 10, 13 and 15 reinforce this strength.",
      ],
      [
        21,
        "There is a coherent broad sequence and a reflective ending; the late story section weakens narrative progression.",
      ],
      [
        5,
        "Cover/contents and mixed diagram/table/chart pages compete for space; composition is not resolved merely by containing several devices (pp. 1, 5).",
      ],
      [
        3,
        "A recognisable heading/body system is present but serif display, centred quotations and multiple emphases feel only partly controlled. Physical size is scored under R1.",
      ],
      [
        9,
        "Blue/gold/green branding is coherent, but repeated domino panels and boxes create a mechanical rhythm (pp. 5, 9, 11).",
      ],
      [
        20,
        "Authentic, respectful imagery is a strength; selection, cropping and portrait/text panels are competently rather than exceptionally directed (pp. 10, 12, 19–20).",
      ],
      [
        23,
        "The publication has a consistent basic identity, but references run into the closing material and the joins between page treatments lack a polished editorial finish.",
      ],
      [
        6,
        "3D pie-chart treatments make part-to-whole comparisons unnecessarily difficult (pp. 5–6, 12).",
      ],
      [
        17,
        "Risk-table text and chart labels need effort to decode. This is data legibility, not another general typography penalty.",
      ],
      [
        6,
        "Important percentage displays do not make their denominator, period and scope sufficiently explicit at the point of use.",
      ],
      [
        12,
        "Provenance and qualifications are not consistently linked to chart values; general references elsewhere do not substitute for chart-specific explanation.",
      ],
      [
        12,
        "Nearby prose supplies some useful takeaways, but chart titles mainly describe the topic rather than the finding.",
      ],
      [
        17,
        "Small coloured labels and the risk-table colour treatment create visual access friction; no measured contrast ratio or colour-blind simulation is claimed.",
      ],
      [
        17,
        "Enlarged rendering makes detail readable, with panning; reflow and interactive zoom behaviour have not been tested.",
      ],
      [
        3,
        "Tags and sampled text structure exist, but their semantic quality is not comprehensively established. This is not an untagged PDF.",
      ],
      [
        12,
        "Sampled figure tags lack alt descriptions; nearby text only partly conveys the charts' complete information.",
      ],
      [
        1,
        "No screen-reader or assistive user test was performed. This criterion is unassessable, not a low score.",
      ],
    ] as [number, string][],
  },
  {
    name: "excellent-designed",
    oldSource:
      "Assistant-authored v1 reference judgement on the same fictional fixture; not a model run",
    old: [
      [4, 4, 4, 4, 4],
      [3, 3, 4, 4, 4],
      [3, 3, 3, 3, 3],
      [4, 3, 4, 4, 4],
      [4, 4, 4, 4, 4],
    ],
    scores: [
      [4, 4, 4, 4, 4],
      [3, 3, 4, 4, 4],
      [3, 3, 3, 3, 3],
      [4, 4, 4, 4, 4],
      [3, 3, 3, 3, null],
    ],
    notes: [] as [number, string][],
  },
  {
    name: "simple-effective",
    oldSource:
      "Assistant-authored v1 reference judgement on the same fictional fixture; not a model run",
    old: [
      [4, 4, 4, 4, 4],
      [3, 3, 4, 4, 4],
      [3, 3, 3, 3, 3],
      [3, 3, 3, 3, 3],
      [4, 4, 4, 4, 4],
    ],
    scores: [
      [4, 4, 4, 4, 4],
      [3, 3, 4, 4, 4],
      [3, 3, 3, 3, 3],
      [4, 4, 4, 4, 4],
      [3, 3, 3, 3, null],
    ],
    notes: [] as [number, string][],
  },
];
export const fixtureEvidence: [number, string][] = [
  [
    1,
    "Comfortable 12-point body text and generous line spacing make the opening usable at ordinary size.",
  ],
  [
    1,
    "The opening states outcomes, coverage, caveats and dated next steps in concise language.",
  ],
  [
    1,
    "Specific outcome/limits/next-step headings provide immediate wayfinding; four pages do not need elaborate contents.",
  ],
  [
    1,
    "312/400, 78%, the 480-household reach and 80 nonresponders are prioritised together.",
  ],
  [1, "Short, well-grouped sections create a clear scan path."],
  [
    3,
    "Alex's fictional housing experience connects a problem, practical advice and a six-month outcome.",
  ],
  [
    3,
    "A specific dignified experience includes family and benefits-advice context; it is not presented as a typical causal effect.",
  ],
  [3, "The example is explicitly linked to the wider finding and its limits."],
  [
    3,
    "The report states waits of 23 days, confusing letters and limited user testing; p. 1 also states nonresponse and no comparison group.",
  ],
  [
    4,
    "The narrative progresses from outcomes to evidence, experience and three decisions with dates and owners.",
  ],
  [
    1,
    "A controlled single-column grid and outcome emphasis separate findings, limits and actions.",
  ],
  [
    1,
    "Consistent headings, body text and measured emphasis are well crafted; typographic novelty is not required.",
  ],
  [
    2,
    "The restrained visual system gives evidence a clear place without decorative variety.",
  ],
  [
    3,
    "The deliberate text-led human example avoids gratuitous photography and protects dignity.",
  ],
  [
    4,
    "Consistent page treatment and a concise closing section provide a carefully resolved publication.",
  ],
  [
    2,
    "The designed fixture uses honest horizontal bars; the simple fixture uses complete textual values. Both are appropriate.",
  ],
  [
    2,
    "Labels and exact values are directly readable without an awkward legend.",
  ],
  [2, "The same 400-household base, period and 400/480 coverage are explicit."],
  [
    2,
    "Source and nonresponse/no-comparison-group caveats sit beside the figures.",
  ],
  [
    2,
    "The 26 percentage-point change is stated explicitly and is not described as causal.",
  ],
  [
    2,
    "High-contrast text and complete numeric labels carry the meaning without relying on colour.",
  ],
  [
    2,
    "Enlarged inspection preserves labels and relationships; reflow remains unverified.",
  ],
  [
    4,
    "The generated PDF contains actual logical tags and tagged text order for sampled visual comparison; no assistive certification is claimed.",
  ],
  [
    2,
    "All chart or tabular values have complete adjacent textual equivalents; essential information is not left to an image.",
  ],
  [
    4,
    "No actual screen-reader/user test: unassessable, excluded with an explicit limitation.",
  ],
];
