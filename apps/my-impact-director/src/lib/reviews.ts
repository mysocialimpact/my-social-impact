import { createHash } from 'node:crypto';
import { z } from 'zod';
import { query, transaction } from './db';
import { type Identity } from './auth';
import { AppError, rateLimit } from './security';
import { VERSION } from './rubric';
import { validatePdf } from './documents';
export const idSchema=z.uuid();
export const ready=()=>process.env.REVIEWS_ENABLED==='true';
export async function createReview(user:Identity,bytes:Buffer,title:string,consent:boolean,qualityConsent:boolean,sourceUrl:string|null=null){
 if(!ready())throw new AppError(503,'Reviews are not open yet while we finish live validation. Please check back soon.','REVIEWS_PAUSED');
 if(!consent)throw new AppError(400,'Please confirm you have permission to submit this report for AI processing.');
 validatePdf(bytes,title);const sha=createHash('sha256').update(bytes).digest('hex');
 const [previous]=await query<{id:string}>(`SELECT v.id FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE r.owner_id=$1 AND r.sha256=$2 AND v.version=$3`,[user.id,sha,VERSION]);if(previous)return previous;
 return transaction(async c=>{
 await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[user.id]);
 const {rows:[limits]}=await c.query(`SELECT count(*) AS total,count(*) FILTER(WHERE created_at>now()-interval '24 hours') AS today FROM director.reports WHERE owner_id=$1`,[user.id]);
 if(Number(limits.total)>=20||Number(limits.today)>=3)throw new AppError(429,'You can review 3 reports per day and keep 20 reports. Delete an old report or try again tomorrow.');
 const {rows:[report]}=await c.query(`INSERT INTO director.reports(owner_id,title,source_url,sha256,file_bytes,consent_version,quality_consent) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(owner_id,sha256) DO UPDATE SET title=reports.title RETURNING id`,[user.id,title.slice(0,200),sourceUrl,sha,bytes,'privacy-1.0',qualityConsent]);
 const {rows:[review]}=await c.query(`INSERT INTO director.reviews(report_id,version) VALUES($1,$2) ON CONFLICT(report_id,version) DO UPDATE SET version=reviews.version RETURNING id`,[report.id,VERSION]);return review as {id:string};});
}
export async function listReviews(user:Identity){return query(`SELECT v.id,v.status,v.stage,v.error_message,v.created_at,v.updated_at,r.title,r.organisation,r.reporting_period,r.source_url,v.result->'scores' AS scores FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE r.owner_id=$1 ORDER BY v.created_at DESC LIMIT 50`,[user.id]);}
export async function getReview(user:Identity,id:string){idSchema.parse(id);const [row]=await query(`SELECT v.*,r.title,r.organisation,r.reporting_period,r.source_url,r.expires_at,r.pages,r.extraction_notes,r.quality_consent FROM director.reviews v JOIN director.reports r ON r.id=v.report_id WHERE v.id=$1 AND r.owner_id=$2`,[id,user.id]);if(!row)throw new AppError(404,'This review is unavailable to your account.');return row;}
export async function retryReview(user:Identity,id:string){await getReview(user,id);await rateLimit(`retry:${user.id}`,3,86400);await query(`UPDATE director.reviews SET status='queued',stage_attempts=0,next_attempt_at=now(),error_message=NULL,error_code=NULL,updated_at=now() WHERE id=$1 AND status='failed' AND attempts<50`,[id]);}
export async function deleteReview(user:Identity,id:string){await getReview(user,id);await query(`DELETE FROM director.reports r USING director.reviews v WHERE v.report_id=r.id AND v.id=$1 AND r.owner_id=$2`,[id,user.id]);}
export async function sourceFile(user:Identity,id:string){idSchema.parse(id);const [r]=await query<{file_bytes:Buffer}>(`SELECT r.file_bytes FROM director.reports r JOIN director.reviews v ON v.report_id=r.id WHERE v.id=$1 AND r.owner_id=$2`,[id,user.id]);if(!r)throw new AppError(404,'Report unavailable.');return r.file_bytes;}
