import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("source PDF standard fonts remain visible without installed system fonts", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
 import {PDFDocument,StandardFonts} from 'pdf-lib';
 import {createCanvas,loadImage,GlobalFonts} from '@napi-rs/canvas';
 import {renderVisualPages} from './src/lib/report-visual.ts';
 const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
 doc.addPage([300,200]).drawText('VISIBLE STANDARD FONT',{x:15,y:85,size:18,font});
 const [page]=await renderVisualPages(Buffer.from(await doc.save()),[1]);
 const image=await loadImage(page.dataUrl),canvas=createCanvas(image.width,image.height),ctx=canvas.getContext('2d');
 ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
 let ink=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>128&&pixels[i]<100&&pixels[i+1]<100&&pixels[i+2]<100)ink++;
 console.log(JSON.stringify({fontFamilies:GlobalFonts.families.length,ink}));
 `,
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DISABLE_SYSTEM_FONTS_LOAD: "1" },
      encoding: "utf8",
      timeout: 30000,
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const rendered = JSON.parse(result.stdout.trim().split("\n").at(-1)!);
  assert.equal(
    rendered.fontFamilies,
    0,
    "The check must reproduce a font-free serverless host",
  );
  assert.ok(
    rendered.ink > 1000,
    `The page text disappeared: ${rendered.ink} dark pixels`,
  );
});
