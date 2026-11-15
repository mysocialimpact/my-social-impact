import { after } from 'next/server';
import { identity } from '@/lib/auth';
import { getReview, retryReview, deleteReview } from '@/lib/reviews';
import { failure, sameOrigin } from '@/lib/security';
import { drain } from '@/lib/pipeline';
export const maxDuration=300;
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Context){try{const r=await getReview(await identity(req),(await ctx.params).id);const {lease_token,...safe}=r;void lease_token;return Response.json(safe,{headers:{'cache-control':'no-store'}});}catch(e){return failure(e);}}
export async function POST(req:Request,ctx:Context){try{sameOrigin(req);const id=(await ctx.params).id;await retryReview(await identity(req),id);after(()=>drain(id));return Response.json({ok:true});}catch(e){return failure(e);}}
export async function DELETE(req:Request,ctx:Context){try{sameOrigin(req);await deleteReview(await identity(req),(await ctx.params).id);return Response.json({ok:true});}catch(e){return failure(e);}}
