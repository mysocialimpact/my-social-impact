import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const live = origin === 'https://mysocialimpact.org';
if (!live && !/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin)) throw new Error('Unexpected test origin');
const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({viewport:{width,height:1000}});
    // Visual verification must not submit email, bookings, research or analytics.
    await page.route('**/api/**', route => route.fulfill({json:{ok:true,events:[]}}));
    await page.goto(`${origin}/are-you-sorp-ready/review`);
    let anchor;
    const screens = live ? ['scope','public-methodology','intro','benefits','find']
      : ['scope','public-methodology','intro','benefits','find','homework','quick-ready','quick-feedback','method','criterion','complete','report-ready','report','final-feedback','support','before-go','next','help','done'];
    for (const [index,screen] of screens.entries()) {
      if (index && live) await page.locator('.scr-bottom>div:last-child>button').last().click();
      else if (!live) {
        await page.evaluate(screen => {
          localStorage.setItem('msi-sorp-canonical-methodology-v1',JSON.stringify({sessionId:'forward-line-visual-test',step:screen,email:'',candidate:null,report:null}));
          localStorage.removeItem('msi-sorp-canonical-methodology-v1-history');
        },screen);
        await page.reload();
      }
      await page.locator('.scr-forward-trace[data-measured]').waitFor({state:'attached'});
      await page.waitForTimeout(550);
      const metrics = await page.evaluate(() => {
        const line = document.querySelector('.scr-forward-trace');
        const style = getComputedStyle(line);
        const length = line.getTotalLength();
        const matrix = line.getScreenCTM();
        let previous = line.getPointAtLength(0).matrixTransform(matrix), pixels = 0, forwards = true;
        for(let i=1;i<=160;i++) {
          const point = line.getPointAtLength(length*i/160).matrixTransform(matrix);
          pixels += Math.hypot(point.x-previous.x,point.y-previous.y);
          forwards &&= point.x >= previous.x;
          previous=point;
        }
        const loops = document.getAnimations().filter(a => a.effect?.getTiming().iterations === Infinity && a.playState==='running').map(a=>a.animationName);
        return {top:line.ownerSVGElement.getBoundingClientRect().top+scrollY,speed:(pixels+52)/parseFloat(style.animationDuration),forwards,loops,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      anchor ??= metrics.top;
      assert.equal(metrics.top,anchor,`${screen}: line moved vertically`);
      assert.ok(Math.abs(metrics.speed-48)<.02,`${screen}: speed ${metrics.speed}`);
      assert.ok(metrics.forwards,`${screen}: backward segment`);
      assert.deepEqual(metrics.loops,['scr-forward-travel'],`${screen}: competing motion`);
      assert.equal(metrics.overflow,false,`${screen}: horizontal overflow`);
      if (['scope','public-methodology','intro','benefits','homework','help'].includes(screen)) await page.screenshot({path:`/tmp/forward-${live?'live':'local'}-${width}-${screen}.png`});
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.deepEqual(await page.locator('.scr-forward-trace').evaluate(el=>({animation:getComputedStyle(el).animationName,dash:getComputedStyle(el).strokeDasharray,visible:getComputedStyle(el).visibility})),{animation:'none',dash:'none',visible:'visible'});
    console.log(JSON.stringify({width,screens:screens.length,constantHeight:anchor,speed:48,leftToRight:true,oneAnimation:true,reducedMotion:true,noOverflow:true}));
    await page.close();
  }
} finally {await browser.close();}
