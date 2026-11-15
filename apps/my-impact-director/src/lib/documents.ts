import { getDocumentProxy, extractText } from 'unpdf';
import { PDFDocument } from 'pdf-lib';
import { z } from 'zod';
import { structured } from './ai';
import { type Page, pageSchema } from './assessment';
import { AppError } from './security';
export const MAX_FILE=4_000_000, MAX_PAGES=100, MAX_TEXT=240000;
export function validatePdf(bytes:Buffer,name:string){
 if(!/\.pdf$/i.test(name)||bytes.length>MAX_FILE||bytes.length<40)throw new AppError(400,'Choose a PDF up to 4 MB.');
 if(bytes.subarray(0,5).toString()!=='%PDF-'||!bytes.subarray(-2048).includes(Buffer.from('%%EOF')))throw new AppError(400,'This file is not a complete PDF.');
 // Never execute embedded active content; reject it before parsing or downloading.
 if(/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(bytes.toString('latin1')))throw new AppError(400,'This PDF contains active or embedded content. Export a flattened PDF and try again.');
}
export async function extractPages(bytes:Buffer):Promise<Page[]>{
 validatePdf(bytes,'report.pdf');const pdf=await getDocumentProxy(new Uint8Array(bytes),{isEvalSupported:false,stopAtErrors:true});
 try{if(pdf.numPages>MAX_PAGES)throw new AppError(400,`Please use a report with at most ${MAX_PAGES} pages.`);
 const {text}=await extractText(pdf,{mergePages:false});
 const pages=text.map((text,i)=>({page:i+1,text,extraction:'text' as const,readable:text.trim().length>=30}));
 if(pages.some(p=>p.text.length>40000)||pages.reduce((n,p)=>n+p.text.length,0)>MAX_TEXT)throw new AppError(400,'This report exceeds the processing limit. Please upload a shorter report.');return pages;
 }finally{await pdf.destroy();}
}
export const visualSchema=z.object({pages:z.array(pageSchema).max(5),observations:z.array(z.object({page:z.number().int().positive(),description:z.string().max(1800),limitations:z.string().max(1000)}).strict()).max(15)}).strict();
export async function readVisualPages(bytes:Buffer,pages:Page[],start:number){
 const source=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});const part=await PDFDocument.create();
 const indexes=pages.slice(start,start+5).map(p=>p.page-1);for(const p of await part.copyPages(source,indexes))part.addPage(p);
 const response=await structured(visualSchema,'Transcribe the supplied PDF pages accurately, including table cells, chart labels, legends and important visual evidence. Never infer numerical values from bars without labelled values. Physical PDF page numbers in this excerpt map to original pages as supplied. Return one text entry per page using original page numbers, extraction ocr and readable true only when confidently legible. If genuinely blank, return text [Blank page], readable true. Keep actual text verbatim, with reading order; record visual descriptions separately as observations, not quotations. Explicitly record illegible elements. Do not assess or score.',{pageMapping:indexes.map((n,i)=>({excerpt:i+1,original:n+1})),existingText:pages.slice(start,start+5)},Buffer.from(await part.save()));
 if(response.data.pages.length!==indexes.length||response.data.pages.some((p,i)=>p.page!==indexes[i]+1))throw new Error('OCR page mapping mismatch.');
 return response;
}
