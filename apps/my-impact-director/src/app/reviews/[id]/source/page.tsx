import { ReviewView } from '@/components/review-view';
export default async function Source({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){return <section className="section narrow"><ReviewView id={(await params).id} sourcePage={Math.max(1,Number((await searchParams).page)||1)}/></section>;}
