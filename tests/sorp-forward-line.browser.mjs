import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
const live = origin === 'https://mysocialimpact.org';
if (!live && !/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin)) throw new Error('Unexpected test origin');
const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({viewport:{width,height:1000}});
    // Visual verification must not submit email, bookings, research or analytics.
    await page.route('**/api/**', route => route.fulfill({json:{ok:true,events:[]}}));
    // Local vinext image optimisation has no ASSETS binding; use the same source image.
    if (!live) await page.route(url => url.pathname.includes('image') && url.searchParams.has('url'), route => {
      const asset = resolve('public', `.${new URL(route.request().url()).searchParams.get('url')}`);
      return asset.startsWith(`${resolve('public')}/`) && existsSync(asset) ? route.fulfill({path:asset}) : route.continue();
    });
    await page.goto(`${origin}/are-you-sorp-ready/review`);
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
        return {speed:pixels/parseFloat(style.animationDuration),iterations:style.animationIterationCount,forwards,loops,paths:document.querySelectorAll('.scr-forward-line path').length,lines:document.querySelectorAll('.scr-forward-line').length,oldGraphics:document.querySelectorAll('.scr-forward-track,.scr-benefits-connection,.si-evidence-visual,.si-impact-signal,.sh-motif,.hs-process-track,.scr-beyond-visual,.scr-feedback-visual').length,overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(metrics.lines,1,`${screen}: more than one Forward Line`);
      assert.equal(metrics.paths,1,`${screen}: duplicate route`);
      assert.equal(metrics.oldGraphics,0,`${screen}: competing graphic`);
      assert.ok(metrics.speed>0 && metrics.speed<=48.02,`${screen}: speed ${metrics.speed}`);
      assert.equal(metrics.iterations,'1',`${screen}: line must draw once and remain`);
      assert.ok(metrics.forwards,`${screen}: backward segment`);
      assert.deepEqual(metrics.loops,[],`${screen}: competing looping motion`);
      assert.equal(metrics.overflow,false,`${screen}: horizontal overflow`);
      if (['scope','public-methodology','intro','benefits','homework','help'].includes(screen)) await page.screenshot({path:`/tmp/forward-${live?'live':'local'}-${width}-${screen}.png`});
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.deepEqual(await page.locator('.scr-forward-trace').evaluate(el=>({animation:getComputedStyle(el).animationName,dash:getComputedStyle(el).strokeDasharray,visible:getComputedStyle(el).visibility})),{animation:'none',dash:'none',visible:'visible'});
    console.log(JSON.stringify({width,screens:screens.length,maxPixelsPerSecond:48,leftToRight:true,singleOrangePath:true,noLoop:true,reducedMotion:true,noOverflow:true}));
    await page.close();
  }
} finally {await browser.close();}
