import { Account } from '@/components/account';
import { PageIntro } from '@/components/shell';
export default async function Login({searchParams}:{searchParams:Promise<{next?:string}>}){return <section className="section account-layout"><PageIntro label="Your free account" title="Good evidence. Better decisions."><p>One simple place for a clearer understanding of your impact reporting.</p></PageIntro><Account next={(await searchParams).next}/></section>;}
