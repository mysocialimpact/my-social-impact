// Editable original vector artwork. Typography: DM Sans (SIL Open Font License).
// Regenerate all SVG/PNG assets with: node scripts/build-brand.mjs
import fs from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { createCanvas, loadImage } from "@napi-rs/canvas";
const font = fontkit.create(
  await fs.readFile(
    "node_modules/@fontsource/dm-sans/files/dm-sans-latin-900-normal.woff",
  ),
);
const italic = fontkit.create(
  await fs.readFile(
    "node_modules/@fontsource/dm-sans/files/dm-sans-latin-900-italic.woff",
  ),
);
const navy = "#080f23",
  orange = "#ff5016",
  pink = "#ff2379";
function lettering(value, x, y, size, fill, slant = false, tracking = -2) {
  let pen = 0;
  const f = slant ? italic : font;
  const run = f.layout(value);
  return `<g aria-label="${value}" fill="${fill}" transform="translate(${x} ${y}) scale(${size / f.unitsPerEm} ${-size / f.unitsPerEm})">${run.glyphs
    .map((g, i) => {
      const out = `<path transform="translate(${pen} 0)" d="${g.path.toSVG()}"/>`;
      pen += run.positions[i].xAdvance + (tracking * f.unitsPerEm) / size;
      return out;
    })
    .join("")}</g>`;
}
function svg(w, h, label, body, bg = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img"><title>${label}</title>${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ""}${body}</svg>`;
}
const out = "public/brand";
await fs.mkdir(out, { recursive: true });
async function save(name, w, h, label, body, bg = "") {
  const s = svg(w, h, label, body, bg);
  await fs.writeFile(`${out}/${name}.svg`, s);
  const canvas = createCanvas(w * 2, h * 2),
    c = canvas.getContext("2d");
  c.drawImage(await loadImage(Buffer.from(s)), 0, 0, w * 2, h * 2);
  await fs.writeFile(`${out}/${name}.png`, canvas.toBuffer("image/png"));
}
function mid(fg = navy, accent = orange) {
  return (
    lettering("MY IMPACT", 10, 78, 91, fg, false, -4) +
    lettering("DIRECTOR", 6, 174, 114, accent, false, -5) +
    `<path fill="${fg}" d="M545 149h23v23h-23z"/>`
  );
}
await save(
  "my-impact-director-horizontal",
  580,
  190,
  "My Impact Director",
  mid(),
);
await save("my-impact-director", 580, 190, "My Impact Director", mid());
await save("my-impact-director-light", 580, 190, "My Impact Director", mid());
await save(
  "my-impact-director-dark",
  580,
  190,
  "My Impact Director",
  mid("#fff", orange),
);
await save(
  "my-impact-director-mono",
  580,
  190,
  "My Impact Director",
  mid(navy, navy),
);
await save(
  "my-impact-director-primary",
  650,
  410,
  "My Impact Director",
  lettering("MY", 15, 90, 100, orange) +
    lettering("IMPACT", 8, 235, 178, navy, false, -9) +
    lettering("DIRECTOR.", 8, 385, 133, navy, false, -7),
);
const monogram =
  `<path fill="${orange}" d="M0 0h160v160H0z"/>` +
  lettering("M", 11, 77, 82, navy, false, -5) +
  lettering("ID", 48, 143, 82, navy, false, -5) +
  `<path d="M18 105L143 28" stroke="white" stroke-width="8"/>`;
await save("my-impact-director-symbol", 160, 160, "MID", monogram);
// Paint is drawn as editable original paths: a broad dry-brush cut with energetic
// overspray, registration flecks and a pink editorial slash through the baseline.
function paint(color = orange) {
  let seed = 491;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const bristles = Array.from({ length: 44 }, (_, i) => {
    const y = 190 + i * 3.1,
      x = 24 + random() * 75,
      end = 470 + random() * 93;
    return `<path d="M${x.toFixed(1)} ${y.toFixed(1)}Q300 ${(y - 24).toFixed(1)} ${end.toFixed(1)} ${(y - 40).toFixed(1)}" stroke="black" opacity="${(0.1 + random() * 0.35).toFixed(2)}" stroke-width="${(0.2 + random() * 1.1).toFixed(2)}" fill="none"/>`;
  }).join("");
  const spray = Array.from({ length: 72 }, () => {
    const side = random() > 0.5,
      x = side ? 510 + random() * 48 : 27 + random() * 54,
      y = side ? 176 + random() * 106 : 210 + random() * 108;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.3 + random() * 1.8).toFixed(1)}" opacity="${(0.15 + random() * 0.7).toFixed(2)}"/>`;
  }).join("");
  return `<defs><mask id="dry-brush"><rect width="600" height="370" fill="white"/>${bristles}</mask></defs><g fill="${color}">${spray}<g mask="url(#dry-brush)"><path d="M54 210Q185 187 338 185T533 172L518 185Q568 176 540 197L557 199 535 220Q560 224 528 235L548 242 519 254Q552 259 514 273L531 277Q350 295 171 318L57 326 70 310Q24 318 55 298L39 294 58 278Q23 278 50 259L31 255 55 239Q27 234 58 219z"/><path d="M36 228Q260 200 550 183L528 196 52 239zM52 319Q293 286 524 269L508 281 66 329z"/></g><path d="M530 242q8 45 2 65l-4-39z"/></g>`;
}
function edit(fg = navy, ink = orange, hot = pink) {
  return `<g transform="rotate(-4 300 190)">${lettering("THE", 69, 66, 42, fg, false, 1)}${lettering("IMPACT", 47, 169, 119, fg, false, -6)}${paint(ink)}${lettering("EDIT", 131, 288, 151, "#fff", true, -7)}<path d="M82 336Q275 303 519 308l-44 12Q252 317 94 346z" fill="${hot}"/><path d="M537 80l-13 73M549 69l-9 50" stroke="${hot}" stroke-width="6" stroke-linecap="round"/></g>`;
}
await save("the-impact-edit", 600, 370, "The Impact Edit", edit());
await save("the-impact-edit-primary", 600, 370, "The Impact Edit", edit());
await save("the-impact-edit-light", 600, 370, "The Impact Edit", edit());
await save(
  "the-impact-edit-dark",
  600,
  370,
  "The Impact Edit",
  edit("#fff", orange, pink),
);
await save(
  "the-impact-edit-mono",
  600,
  370,
  "The Impact Edit",
  edit(navy, navy, navy),
);
await save(
  "the-impact-edit-horizontal",
  1000,
  240,
  "The Impact Edit",
  `<g transform="translate(10 -28) scale(.8)">${lettering("THE", 28, 90, 48, navy, false, 1)}${lettering("IMPACT", 19, 237, 160, navy, false, -7)}</g><g transform="translate(499 -50) scale(.75)">${paint()}${lettering("EDIT", 114, 285, 150, "#fff", true, -7)}<path d="M60 323Q260 296 515 305" fill="none" stroke="${pink}" stroke-width="9"/></g>`,
);
await save(
  "the-impact-edit-symbol",
  320,
  320,
  "The Impact Edit",
  `<g transform="translate(-5 -90) scale(.55 1.1)">${paint()}</g>${lettering("THE", 63, 86, 54, navy, false, 1)}${lettering("IE", 67, 254, 183, "#fff", true, -8)}<path d="M35 282Q170 257 289 271" fill="none" stroke="${pink}" stroke-width="9"/>${lettering("THE IMPACT EDIT", 20, 315, 25, navy, false, -0.5)}`,
);
// Legacy asset URLs remain valid for stored clients, now carrying the new artwork.
for (const [old, current] of [
  ["impact-report-excellence", "the-impact-edit"],
  ["impact-report-excellence-horizontal", "the-impact-edit-horizontal"],
  ["impact-report-excellence-symbol", "the-impact-edit-symbol"],
  ["impact-report-excellence-dark", "the-impact-edit-dark"],
  ["impact-report-excellence-light", "the-impact-edit-light"],
  ["impact-report-excellence-mono", "the-impact-edit-mono"],
])
  for (const ext of ["svg", "png"])
    await fs.copyFile(`${out}/${current}.${ext}`, `${out}/${old}.${ext}`);
const favicon = svg(160, 160, "My Impact Director", monogram);
await fs.writeFile("src/app/icon.svg", favicon);
await fs.writeFile("public/favicon.svg", favicon);
await fs.mkdir("assets/brand", { recursive: true });
await fs.copyFile(
  "node_modules/@fontsource/dm-sans/LICENSE",
  "assets/brand/DM-Sans-OFL.txt",
);
console.log(
  "Generated editable wordmarks, expressive Impact Edit artwork, variants, PNG exports and favicon.",
);
