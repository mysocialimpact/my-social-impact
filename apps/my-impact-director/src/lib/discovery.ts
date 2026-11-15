import { createHmac } from 'node:crypto';
import { load } from 'cheerio';
import { searchWeb } from './ai';
import { publicFetch, publicUrl } from './public-fetch';
import { validatePdf } from './documents';
import { AppError, secretMatches } from './security';
export type Candidate={organisation:string;title:string;year:string|null;url:string;source:string;token:string;expires:number};
function signature(owner:string,url:string,expires:number){if(!process.env.CRON_SECRET)throw new AppError(503,'Report discovery is unavailable.');return createHmac('sha256',process.env.CRON_SECRET).update(JSON.stringify([owner,url,expires])).digest('hex');}
export function verifyCandidate(owner:string,c:{url:string;expires:number;token:string}){if(c.expires<Date.now()||c.expires>Date.now()+3600000||!secretMatches(c.token,signature(owner,c.url,c.expires)))throw new AppError(400,'This search result has expired. Please search again.');publicUrl(c.url);}
export async function discoverReports(owner:string,organisation:string):Promise<Candidate[]>{
 const citations=await searchWeb(organisation);const candidates:{url:string;title:string}[]=[];
 for(const link of citations.slice(0,7)){
  try{const fetched=await publicFetch(link.url);if(fetched.status!==200)continue;
   if(fetched.bytes.subarray(0,5).toString()==='%PDF-'){validatePdf(fetched.bytes,'report.pdf');candidates.push({url:fetched.url,title:link.title});}
   else if(fetched.type.includes('html')){const $=load(fetched.bytes.toString());$('a[href]').each((_,a)=>{try{const url=publicUrl(new URL($(a).attr('href')!,fetched.url).href);const title=$(a).text().replace(/\s+/g,' ').trim();if(/\.pdf(?:$|\?)/i.test(url.href)&&/impact|annual|report|review|20\d{2}/i.test(title+url.pathname))candidates.push({url:url.href,title:title||link.title});}catch{}});}
  }catch{/* Restricted or unavailable sources are excluded, never bypassed. */}
 }
 const verified:Candidate[]=[];
 for(const c of [...new Map(candidates.map(c=>[c.url,c])).values()].slice(0,8)){
  try{const f=await publicFetch(c.url);if(f.status!==200)continue;validatePdf(f.bytes,'report.pdf');const expires=Date.now()+1800000;verified.push({organisation,title:c.title.slice(0,220),year:(c.title.match(/\b20\d{2}(?:[–/-]\d{2,4})?\b/)||[])[0]||null,url:f.url,source:new URL(f.url).hostname,expires,token:signature(owner,f.url,expires)});}catch{}
 }return verified;
}
