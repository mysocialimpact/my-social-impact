import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.TEST_ORIGIN || 'http://localhost:3100';
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin)) throw new Error('Synthetic UI test is local-only');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    let releaseProfile, releaseTar;
    const candidate = { name: 'Homework UI fixture', entityType: 'registered_charity', registrationNumber: '1234567', latestIncome: 500000, reportPeriod: '2025', accountingBasis: 'accruals', accountingBasisConfidence: 'HIGH', sources: [], website: '' };
    const lens = { lens: 'tar', readable: true, score: 68, findings: Array.from({length: 15}, (_, i) => ({fieldId: i + 1})), diagnostics: {pageCount: 26, pagesProcessed: 26, textExtractionSuccess: true, extractedTextLength: 54000, allChunksIndexed: true, assessmentRetrievalSucceeded: true} };
    await page.route('**/api/growth-event', route => route.fulfill({json: {ok:true}}));
    await page.route('**/api/published-review', async route => {
      const operation = route.request().postDataJSON().operation;
      assert.ok(['profile', 'tar'].includes(operation));
      await new Promise(resolve => { if(operation === 'profile') releaseProfile = resolve; else releaseTar = resolve; });
      await route.fulfill({json: operation === 'profile' ? {candidate, state: {setup: {income:'tier2'}}, intelligence: {layers:[]}} : {lens}});
    });
    await page.goto(`${origin}/are-you-sorp-ready/review`);
    await page.evaluate(candidate => localStorage.setItem('msi-sorp-final-candidate-v1', JSON.stringify({sessionId:'homework-ui-test',step:'confirmation',candidate})), candidate);
    await page.reload();
    await page.getByRole('button', {name:'YES, THIS IS MY CHARITY'}).click();
    await page.locator('.scr-homework-messages').waitFor();
    assert.equal(await page.locator('.scr-homework-experience li.is-active').count(), 1);
    assert.equal(await page.locator('.scr-homework-experience li.is-complete').count(), 0);
    const top = await page.locator('.scr-evidence-checklist').evaluate(el => el.getBoundingClientRect().top + scrollY);
    await page.screenshot({path:`/tmp/homework-${width}.png`,fullPage:true});
    await page.waitForTimeout(14000);
    assert.equal(await page.locator('.scr-homework-experience li.is-complete').count(), 0);
    assert.equal(await page.getByText('PUBLIC HOMEWORK COMPLETE ✓',{exact:true}).count(),0);
    assert.equal(await page.locator('.scr-evidence-checklist').evaluate(el=>el.getBoundingClientRect().top+scrollY),top);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    releaseProfile();
    await page.waitForTimeout(1500);
    assert.ok(await page.locator('.scr-homework-experience li.is-complete').count() > 0);
    assert.equal(await page.locator('.scr-homework-experience li').first().getAttribute('class'),'');
    assert.ok(releaseTar);
    releaseTar();
    await page.getByText('PUBLIC HOMEWORK COMPLETE ✓',{exact:true}).waitFor({timeout:30000});
    await page.getByRole('button',{name:'BUILD MY HISTORICAL SNAPSHOT'}).waitFor();
    assert.equal(await page.locator('.scr-homework-experience li.is-complete').count(),8);
    assert.ok((await page.locator('.scr-homework-trust').innerText()).includes('Social Impact Claims Code'));
    console.log(JSON.stringify({width,noFalseTicks:true,minimumWait:true,stableLayout:true,completionGate:true,noOverflow:true}));
    await page.close();
  }
} finally { await browser.close(); }
