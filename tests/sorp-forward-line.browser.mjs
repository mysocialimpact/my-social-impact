import assert from "node:assert/strict";
import { chromium } from "playwright";
import definition from "../app/sorp-methodology-v1.generated.json" with { type: "json" };

const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(origin)) throw Error("Local, side-effect-free test only");

const findings = definition.tests.map((test, index) => ({
  fieldId: index + 1, questionId: test.id, answer: index < 6 ? "yes" : index < 14 ? "mostly" : "partly", confidence: "HIGH",
  finding: `Published finding ${index + 1}.`, reason: "Evidence-based test reason.", excerpt: "Published test evidence.", page: String(index + 1),
  sourceUrl: "https://example.invalid/report.pdf", action: "Strengthen this reporting area.", requirement: test.why,
  classification: test.tiers[1].status, sources: [],
}));
const diagnostics = { pageCount: 30, pagesProcessed: 30, textExtractionSuccess: true, extractedTextLength: 90000, allChunksIndexed: true, assessmentRetrievalSucceeded: true };
const tar = { lens: "tar", methodologyVersion: "1.0", tier: "tier2", mandatory: { applicable: 13, demonstrated: 4, attention: 6, gaps: 3, unconfirmed: 0 }, readable: true, score: 72, confidence: "HIGH", title: "Test Trustees’ Annual Report", period: "2025", sourceUrl: "https://example.invalid/report.pdf", accountingBasis: "accruals", findings, limitation: "", diagnostics };
const candidate = { name: "Visual Test Charity", registrationNumber: "123456", locality: "London", jurisdiction: "England and Wales", entityType: "registered_charity", latestIncome: 1000000, financialYearEnd: "2025-12-31", accountingBasis: "accruals", accountingBasisConfidence: "HIGH", website: "https://example.invalid", officialUrl: "https://example.invalid/record", summary: "", reportUrl: tar.sourceUrl, reportTitle: tar.title, reportPeriod: tar.period, publicReadiness: { impactReport: { found: false, title: "", url: "" } }, sources: [] };
const report = { candidate, tar, wider: { ...tar, lens: "wider" }, createdAt: "2026-10-02T09:00:00.000Z", intelligence: { effectiveVersion: "test", layers: [] } };
const corrections = Object.fromEntries(findings.map(finding => [String(finding.fieldId), { answer: finding.answer, context: "", savedContext: "", reviewed: true }]));
const base = { sessionId: "forward-composition-test", query: "Visual Test Charity", research: { status: "complete", candidates: [candidate], selected: candidate, query: "Visual Test Charity" }, candidate, state: { setup: { role: "", jurisdiction: "ew", startDate: "", endDate: "", accounts: "accruals", income: "tier2", nearBoundary: false, activities: [] } }, intelligence: null, verifiedTar: tar, report, homeworkFailure: { reason: "The report could not be read.", incidentId: "INC-TEST" }, email: "visual@example.invalid", emailConfirm: "visual@example.invalid", name: "", role: "", roleOther: "", criterion: 0, corrections, reportView: 0, emailSent: true, supportPaid: false, quickRating: 4, quickComment: "", finalRating: 4, finalComment: "" };

const screens = ["scope", "public-methodology", "intro", "benefits", "find", "confirmation", "homework", "quick-ready", "quick", "quick-feedback", "method", "criterion", "complete", "report-ready", "report", "report-agenda", "final-feedback", "support", "before-go", "next", "help", "done", "tar-recovery", "non-sorp"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = [];
try {
  for (const width of [1440, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.route("**/api/**", route => route.fulfill({ json: { ok: true, events: [], services: [] } }));
    for (const screen of screens) {
      await page.goto(`${origin}/are-you-sorp-ready/review`);
      await page.evaluate(({ base, screen }) => {
        const state = { ...base, step: screen === "report-agenda" ? "report" : screen, reportView: screen === "report-agenda" ? 1 : 0 };
        localStorage.setItem("msi-sorp-canonical-methodology-v1", JSON.stringify(state));
        localStorage.removeItem("msi-sorp-canonical-methodology-v1-history");
      }, { base, screen });
      await page.reload();
      await page.evaluate(() => document.fonts.ready);
      await page.locator(".scr-main").waitFor();
      const traceLocator = page.locator(".scr-forward-trace");
      if (await traceLocator.count()) await page.waitForFunction(() => document.querySelector(".scr-forward-trace")?.hasAttribute("data-measured"));
      const result = await page.evaluate(() => {
        const route = document.querySelector(".scr-forward-line");
        const trace = route?.querySelector(".scr-forward-trace");
        const track = route?.querySelector(".scr-forward-track");
        return {
          routes: document.querySelectorAll(".scr-forward-line").length,
          stationLabels: [...document.querySelectorAll(".scr-forward-stations strong")].map(element => element.textContent),
          sameRoute: !trace || trace.getAttribute("d") === track?.getAttribute("d"),
          animation: trace ? getComputedStyle(trace).animationName : "none",
          orange: trace ? getComputedStyle(trace).stroke : "",
          track: track ? getComputedStyle(track).stroke : "",
          areaProgress: document.querySelectorAll(".scr-area-progress").length,
          hiddenHomeworkHeadings: [...document.querySelectorAll(".sh-process>li>h2")].every(element => getComputedStyle(element).display === "none"),
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlay: Boolean(document.querySelector("[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay")),
        };
      });
      const issues = [];
      if (result.routes !== 1 || !result.sameRoute) issues.push("route-count");
      if (screen === "criterion" && result.areaProgress !== 1) issues.push("missing-question-progress");
      if (screen !== "benefits" && ![3, 4].includes(result.stationLabels.length)) issues.push("missing-composed-stations");
      if (screen === "benefits" && result.stationLabels.length) issues.push("duplicate-benefit-stations");
      if (screen === "homework" && !result.hiddenHomeworkHeadings) issues.push("duplicate-homework-stages");
      if (result.routes && (result.animation === "none" || result.orange === result.track)) issues.push("motion");
      if (result.overflow) issues.push("overflow");
      if (result.overlay) issues.push("error-overlay");
      if (issues.length) failures.push({ width, screen, issues, ...result });
      if ([1440, 390].includes(width) && ["scope", "public-methodology", "intro", "benefits", "find", "criterion", "quick", "method", "help"].includes(screen)) await page.screenshot({ path: `/tmp/forward-${width}-${screen}.png`, fullPage: true });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${origin}/are-you-sorp-ready/review`);
    await page.evaluate(base => localStorage.setItem("msi-sorp-canonical-methodology-v1", JSON.stringify({ ...base, step: "scope" })), base);
    await page.reload();
    assert.equal(await page.locator(".scr-forward-trace").evaluate(element => getComputedStyle(element).animationName), "none");
    await page.close();
  }
  console.log(JSON.stringify({ screens: screens.length, widths: 3, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
} finally {
  await browser.close();
}
