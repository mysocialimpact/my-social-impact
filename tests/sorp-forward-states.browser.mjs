// Local presentation test: every API is intercepted; no research/email/booking is sent.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const fixture=JSON.parse(readFileSync(process.env.REVIEW_FIXTURE,'utf8'));
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin))throw Error('Local only');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 for(const width of [1126,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  await page.route('**/api/**',route=>route.fulfill({json:{ok:true,events:[]}}));
  await page.goto(origin+'/are-you-sorp-ready/review');
  async function seed(overrides){
   await page.evaluate(({fixture,overrides})=>{
    const corrections=Object.fromEntries(fixture.report.tar.findings.map((f,i)=>[String(i+1),{answer:f.answer,context:'',savedContext:'',reviewed:true}]));
    localStorage.setItem('msi-sorp-canonical-methodology-v1',JSON.stringify({...fixture,sessionId:'motion-states-test',corrections,email:'visual-test@example.invalid',emailConfirm:'visual-test@example.invalid',emailSent:false,...overrides}));
    localStorage.removeItem('msi-sorp-canonical-methodology-v1-history');
   },{fixture,overrides});await page.reload();await page.locator('.scr-screen-hero').waitFor();
  }
  let anchor;
  async function check(label){
   await page.evaluate(()=>document.fonts.ready);
   const result=await page.evaluate(()=>{
    const path=document.querySelector('.scr-forward-trace'),h1=document.querySelector('.scr-screen-hero h1');
    return {y:path.getPointAtLength(0).matrixTransform(path.getScreenCTM()).y+scrollY,bottom:h1.getBoundingClientRect().bottom+scrollY,lines:document.querySelectorAll('.scr-forward-line').length,labels:document.querySelectorAll('.scr-forward-labels').length,dash:getComputedStyle(path).strokeDashoffset};
   });anchor??=result.y;
   assert.ok(Math.abs(result.y-anchor)<2,label+': shifted route');
   assert.ok(result.bottom<result.y-8,label+': overlapping title');
   assert.equal(result.lines,1);assert.equal(result.labels,0);
   return result;
  }
  await seed({step:'homework',report:null,verifiedTar:fixture.report.tar});
  await page.getByRole('button',{name:'BUILD MY HISTORICAL SNAPSHOT',exact:false}).click();
  const first=await check('snapshot first message');
  await page.waitForTimeout(1200);
  assert.notEqual((await check('traveller moves')).dash,first.dash);
  await page.waitForTimeout(6000);await check('snapshot second message');
  await page.waitForTimeout(4100);await check('snapshot third message');
  await page.getByRole('button',{name:'VIEW MY HISTORICAL SNAPSHOT',exact:false}).waitFor();
  await check('snapshot ready');
  await seed({step:'complete'});
  await page.getByRole('button',{name:'BUILD MY PERSONALISED REPORT',exact:false}).click();
  await check('report building');
  await seed({step:'confirmation',verifiedTar:null,report:null,state:null,intelligence:null});
  await page.route('**/api/published-review',()=>{ /* Hold the request to exercise genuine waiting UI. */ });
  await page.getByRole('button',{name:'YES, THIS IS MY CHARITY',exact:false}).click();
  await check('homework normal');
  assert.deepEqual(await page.locator('.sh-process h2').allTextContents(),['Document','Evidence','SORP','Assessment']);
  await page.screenshot({path:`/tmp/route-${width}-homework-working.png`});
  await page.waitForTimeout(7500);await check('homework delay');
  await page.waitForTimeout(4000);await check('homework continued delay');
  console.log(JSON.stringify({width,transientStates:true,singleProgressHeadings:true,movingTraveller:true,anchor}));
  await page.close();
 }
}finally{await browser.close()}
