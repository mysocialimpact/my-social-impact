import { query } from '@/lib/db';
import { ready } from '@/lib/reviews';
export const dynamic='force-dynamic';
export async function GET(){try{await query('SELECT 1');return Response.json({status:'ok',reviewsEnabled:ready()},{headers:{'cache-control':'no-store'}});}catch{return Response.json({status:'unavailable',reviewsEnabled:false},{status:503});}}
