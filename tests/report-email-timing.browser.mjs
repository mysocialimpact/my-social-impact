import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const origin = process.env.TEST_ORIGIN || 'http://localhost:4178';
const live = process.env.LIVE_EMAIL === '1';
const key = 'msi-sorp-final-candidate-v1';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage();
  let sends = 0;
  let sentStage;
  page.on('request', request => {
    if (request.method() === 'POST' && /\/api\/readiness\/(review-)?report-email$/.test(request.url())) {
      sends++;
      sentStage = request.postDataJSON().deliveryStage;
    }
  });
  await page.route('**/api/growth-event', route => route.fulfill({ json: { ok: true } }));
  let releaseSend;
  if (!live) await page.route('**/api/readiness/review-report-email', async route => {
    await new Promise(resolve => { releaseSend = resolve; });
    await route.fulfill({ json: { ok: true, attachment: 'timing-test.pdf' } });
  });
  await page.goto(`${origin}/are-you-sorp-ready/review`);
  const rejected = await page.request.post(`${origin}/api/readiness/review-report-email`, { data: { deliveryStage: 'report-ready' } });
  assert.equal(rejected.status(), 409);
  await page.evaluate(({ key }) => {
    const candidate = { name: 'MSI email timing verification (test)', registrationNumber: '', latestIncome: 100000, entityType: 'registered_charity', sources: [], publicReadiness: { impactReport: { found: false } } };
    const findings = Array.from({ length: 15 }, (_, index) => ({ fieldId: index + 1, answer: 'mostly', confidence: 'HIGH', finding: `Email timing test criterion ${index + 1}`, reason: 'Synthetic fixture used only to verify report email timing.', excerpt: 'Test evidence', page: '1', sourceUrl: '', action: 'Test priority', requirement: 'Test requirement', classification: 'SHOULD', sources: [] }));
    const tar = { lens: 'tar', readable: true, score: 75, confidence: 'HIGH', title: 'Email timing test fixture', period: '2025', sourceUrl: '', accountingBasis: 'accruals', findings, limitation: 'Synthetic test; not a charity assessment.', diagnostics: { allChunksIndexed: true, assessmentRetrievalSucceeded: true } };
    const report = { candidate, tar, wider: { ...tar, lens: 'wider', score: null, findings: [], limitation: 'Not assessed' }, createdAt: new Date().toISOString(), intelligence: { effectiveVersion: 'test', layers: [] } };
    localStorage.setItem(key, JSON.stringify({ sessionId: crypto.randomUUID(), step: 'criterion', candidate, report, email: 'marcus@mysocialimpact.org', emailConfirm: 'marcus@mysocialimpact.org', name: 'Email timing verification', criterion: 14, corrections: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [i + 1, { reviewed: true, context: '' }])), reportView: 0, emailSent: false }));
  }, { key });
  await page.reload();
  const click = name => page.getByRole('button', { name, exact: false }).click();
  await click('COMPLETE MY CURRENT READINESS');
  assert.equal(sends, 0);
  await click('BUILD MY PERSONALISED REPORT');
  await page.getByRole('button', { name: 'VIEW MY PERSONALISED REPORT' }).waitFor({ timeout: 30000 });
  assert.equal(sends, 0);
  await click('VIEW MY PERSONALISED REPORT');
  assert.equal(sends, 0);
  await click('SEE MY PRIORITIES');
  await click('FINISH MY REVIEW');
  await click('CONTINUE');
  await click('NOT NOW');
  await click('YES — TELL ME A LITTLE MORE');
  await click('HOW CAN YOU HELP US?');
  assert.equal(sends, 0);
  await click('SKIP TO FINISH');
  await page.getByRole('heading', { name: 'YOUR REVIEW IS COMPLETE.' }).waitFor();
  if (!live) {
    await page.waitForFunction(() => document.body.textContent.includes('EMAIL DELIVERY IS NOT YET CONFIRMED'));
    assert.equal(await page.getByText('YOUR PERSONALISED REPORT HAS BEEN EMAILED TO:').count(), 0);
    while (!releaseSend) await new Promise(resolve => setTimeout(resolve, 20));
    releaseSend();
  }
  await page.getByText('YOUR PERSONALISED REPORT HAS BEEN EMAILED TO:').waitFor({ timeout: 60000 });
  assert.equal(sends, 1);
  assert.equal(sentStage, 'done');
  await page.reload();
  await page.getByText('YOUR PERSONALISED REPORT HAS BEEN EMAILED TO:').waitFor();
  await click('← BACK');
  await click('FORWARD →');
  await page.getByText('YOUR PERSONALISED REPORT HAS BEEN EMAILED TO:').waitFor();
  assert.equal(sends, 1);
  console.log(JSON.stringify({ origin, live, earlySends: 0, finalSends: sends, sentStage, confirmationAfterSuccess: true, refreshAndHistoryDeduplicated: true, earlyEndpointRejected: true }));
} finally { await browser.close(); }
