// Adapted from SORP2026's public-fetch safeguards; no cookies or credentials forwarded.
import { request } from 'node:https';
import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import robotsParser from 'robots-parser';
export const AGENT='MyImpactDirector/1.0 (+https://myimpactdirector.com/privacy)';
export function publicUrl(input:string){const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||u.port&&u.port!=='443'||u.hostname.endsWith('.local')||u.hostname==='localhost')throw new Error('Only public HTTPS documents can be retrieved.');return u;}
export function assertPublicAddress(ip:string){if(!ipaddr.isValid(ip)||ipaddr.process(ip).range()!=='unicast')throw new Error('Private or reserved addresses are blocked.');}
export async function publicFetch(input:string,maxBytes=4_000_000,redirects=0,robots=true):Promise<{url:string;bytes:Buffer;type:string;status:number}>{
 const url=publicUrl(input);if(robots)await checkRobots(url.href);
 const addresses=await lookup(url.hostname.replace(/^\[|\]$/g,''),{all:true});if(!addresses.length)throw new Error('Website unavailable.');addresses.forEach(a=>assertPublicAddress(a.address));const address=addresses[0];
 const result=await new Promise<{status:number;bytes:Buffer;type:string;location?:string}>((resolve,reject)=>{
 const req=request(url,{headers:{'User-Agent':AGENT,Accept:'application/pdf,text/html,text/plain','Accept-Encoding':'identity'},lookup:(_h,options,cb)=>options.all?cb(null,[address]):cb(null,address.address,address.family),timeout:12000},res=>{const chunks:Buffer[]=[];let size=0;res.on('data',(c:Buffer)=>{size+=c.length;if(size>maxBytes){res.destroy(new Error('Document exceeds size limit.'));return;}chunks.push(c);});res.on('error',reject);res.on('end',()=>resolve({status:res.statusCode||0,bytes:Buffer.concat(chunks),type:String(res.headers['content-type']||''),location:res.headers.location}));});
 const timer=setTimeout(()=>req.destroy(new Error('Website timed out.')),18000);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.on('timeout',()=>req.destroy(new Error('Website timed out.')));req.end();});
 if(result.status>=300&&result.status<400&&result.location){if(redirects>=3)throw new Error('Too many redirects.');return publicFetch(new URL(result.location,url).href,maxBytes,redirects+1,robots);}
 return {...result,url:url.href};
}
export async function checkRobots(input:string){const u=publicUrl(input);const r=await publicFetch(new URL('/robots.txt',u).href,300000,0,false);if(r.status===404||r.status===410)return;if(r.status!==200||/captcha|cf-chl-|access denied/i.test(r.bytes.toString()))throw new Error('The source website restricts automated access.');if(robotsParser(new URL('/robots.txt',u).href,r.bytes.toString()).isAllowed(input,AGENT)===false)throw new Error('The source website does not permit automated retrieval.');}
