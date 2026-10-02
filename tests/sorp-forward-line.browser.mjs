import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
if(!/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin)) throw Error('Local, side-effect-free test only');
if(!process.env.REVIEW_FIXTURE)throw Error('Set REVIEW_FIXTURE to a saved, validated review JSON. All APIs are intercepted.');
const fixture=JSON.parse(readFileSync(process.env.REVIEW_FIXTURE,'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const failures=[];
try{
 for(const width of [1126,1440,768,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  await page.route('**/api/**',route=>route.fulfill({json:{ok:true,events:[]}}));
  await page.route(url=>url.pathname.includes('image')&&url.searchParams.has('url'),route=>{
   const asset=resolve('public','.'+new URL(route.request().url()).searchParams.get('url'));
   return asset.startsWith(resolve('public')+'/')&&existsSync(asset)?route.fulfill({path:asset}):route.continue();
  });
  await page.goto(origin+'/are-you-sorp-ready/review');
  const screens=['scope','public-methodology','intro','benefits','find','confirmation','homework','quick-ready','quick','quick-feedback','method',...Array.from({length:19},(_,i)=>'criterion-'+i),'complete','report-ready','report','agenda','final-feedback','support','before-go','next','help','done','tar-recovery','non-sorp'];
  let reference;
  for(const screen of screens){
   await page.evaluate(({fixture,screen})=>{
    const state={...fixture,step:screen.startsWith('criterion-')?'criterion':screen==='agenda'?'report':screen,criterion:screen.startsWith('criterion-')?Number(screen.split('-')[1]):0,reportView:screen==='agenda'?1:0,email:'visual-test@example.invalid',emailConfirm:'visual-test@example.invalid',emailSent:true,sessionId:'route-layout-test'};
    state.corrections=Object.fromEntries(fixture.report.tar.findings.map((f,i)=>[String(i+1),{answer:f.answer,context:'',savedContext:'',reviewed:true}]));
    localStorage.setItem('msi-sorp-canonical-methodology-v1',JSON.stringify(state));
    localStorage.removeItem('msi-sorp-canonical-methodology-v1-history');
   },{fixture,screen});
   await page.reload();
   await page.locator('.scr-forward-trace[data-measured]').waitFor({state:'attached'});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForTimeout(100);
   const m=await page.evaluate(()=>{
    const path=document.querySelector('.scr-forward-trace'),track=document.querySelector('.scr-forward-track'),hero=document.querySelector('.scr-screen-hero'),h1=hero?.querySelector('h1'),main=document.querySelector('.scr-main'),guide=document.querySelector('.scr-supporting-guide');
    const point=path.getPointAtLength(0).matrixTransform(path.getScreenCTM());
    const style=getComputedStyle(path);
    return {y:point.y+scrollY,lines:document.querySelectorAll('.scr-forward-line').length,sameRoute:path.getAttribute('d')===track.getAttribute('d'),track:getComputedStyle(track).stroke,orange:style.stroke,iterations:style.animationIterationCount,duration:style.animationDuration,trail:parseFloat(style.getPropertyValue('--forward-trail')),overflow:document.documentElement.scrollWidth>innerWidth,titleBottom:h1.getBoundingClientRect().bottom+scrollY,heroBottom:hero.getBoundingClientRect().bottom+scrollY,guideBelow:!guide||guide.getBoundingClientRect().top>=main.getBoundingClientRect().bottom-1,duplicateLabels:document.querySelectorAll('.scr-forward-labels').length};
   });
   reference??=m.y;
   const issues=[];
   if(Math.abs(m.y-reference)>2)issues.push('anchor');
   if(m.titleBottom>m.y-8)issues.push('title-overlap');
   if(m.lines!==1||!m.sameRoute||m.duplicateLabels)issues.push('duplicates');
   if(m.overflow)issues.push('overflow');
   if(!m.guideBelow)issues.push('sidebar');
   if(m.iterations!=='infinite'||m.trail>22||m.track===m.orange)issues.push('motion');
   if(issues.length)failures.push({width,screen,issues,...m});
   if([1126,390].includes(width)&&['scope','benefits','find','homework','method','help'].includes(screen))await page.screenshot({path:`/tmp/route-${width}-${screen}.png`});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.scr-forward-trace').evaluate(e=>getComputedStyle(e).animationName),'none');
  console.log(JSON.stringify({width,screens:screens.length,reference}));
  await page.close();
 }
 console.log(JSON.stringify({failures},null,2));
 if(failures.length)process.exitCode=1;
}finally{await browser.close()}
