import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the My Social Impact homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>My Social Impact \| Strategy for Social Impact Excellence<\/title>/i);
  assert.match(html, /Imagine a world where social impact was taken as seriously as financial performance/i);
  assert.match(html, /We’re a boutique social impact consultancy/i);
  assert.match(html, /Strategy[\s\S]*Projects[\s\S]*Ongoing support/i);
  assert.ok(html.indexOf('id="consultancy"') > html.indexOf('id="vision"'));
  assert.ok(html.indexOf('id="consultancy"') < html.indexOf('id="introduction"'));
  assert.match(html, /href="\/social-impact-claims-code"/i);
  assert.match(html, /href="\/social-impact-excellence"/i);
  assert.match(html, /href="\/are-you-sorp-ready"/i);
  assert.match(html, /Are You SORP Ready/i);
  const productHtml = html.slice(html.indexOf('id="products"'), html.indexOf('id="values"'));
  assert.ok(productHtml.indexOf("Social Impact Excellence") < productHtml.indexOf("Social Impact Claims Code"));
  assert.ok(productHtml.indexOf("Social Impact Claims Code") < productHtml.indexOf("Are You SORP Ready"));
  assert.ok(productHtml.indexOf("Are You SORP Ready") < productHtml.indexOf("Purpose Works"));
  assert.ok(productHtml.indexOf("Purpose Works") < productHtml.indexOf("Community Mapping"));
  assert.ok(productHtml.indexOf("Community Mapping") < productHtml.indexOf("Charity Impact Reports"));
  assert.doesNotMatch(productHtml, /Festival Impact Reports/i);
  assert.match(html, /href="\/purpose-works"/i);
  assert.match(html, /href="\/community-mapping"/i);
  assert.match(html, /COMMUNITY MAPPING/i);
  assert.match(html, /\/assets\/ideas-shed-logo-approved\.png/i);
  assert.doesNotMatch(html, /footer-brand/i);
  assert.doesNotMatch(html, /footer-bottom/i);
  assert.match(html, /THE IDEAS SHED LIMITED\./i);
  assert.match(html, /Registered in England and Wales · Company number 17380053/i);
  assert.match(html, /Start your Social Impact Maturity Assessment today/i);
  assert.match(html, /Explore Assessments/i);
  assert.match(html, /href="\/assessments"/i);
  assert.match(html, /href="https:\/\/platform\.mysocialimpact\.org\/snapshot"/i);
  assert.doesNotMatch(html, /id="ecosystem"/i);
  assert.doesNotMatch(html, /Good Numbers/i);
  assert.doesNotMatch(html, />Ecosystem</i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("every page inherits the global build stamp", async () => {
  const layout = await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /global-build-stamp/);
  assert.match(layout, /BUILD 83 · 23 SEPTEMBER 2026 · 19:36 BST/);
});

test("explicit setup confirmations save directly without an intelligence thinking state", async () => {
  const conversation = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  assert.match(conversation, /function isDeterministicSetupReply/);
  assert.match(conversation, /\["accountsConfirmation", "startDateConfirmation"\]/);
  assert.match(conversation, /quickAdvancing \? "Saving…"/);
  assert.doesNotMatch(conversation, /quickAdvancing \? "Understanding…"/);
});

test("Quick Readiness Review keeps TAR and wider evidence separate", async () => {
  const conversation = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  assert.match(conversation, /Quick Readiness Review/);
  assert.match(conversation, /So — how SORP ready do you look\?/);
  assert.match(conversation, /We also found wider impact evidence/);
  assert.match(conversation, /How’s this going\?/);
  assert.match(conversation, /Extremely useful/);
  assert.match(conversation, /go deeper/i);
});

test("structured choices share the bottom response area with chat and voice", async () => {
  const conversation = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  const composer = conversation.indexOf('className={`readiness-composer');
  const actions = conversation.indexOf("{showResponseActions && <nav", composer);
  const textarea = conversation.indexOf('id="readiness-answer"', actions);
  const microphone = conversation.indexOf('className="readiness-mic"', textarea);
  assert.ok(composer > -1 && actions > composer && textarea > actions && microphone > textarea);
  assert.doesNotMatch(conversation, /message\.actions\?\.length/);
  assert.match(conversation, /Or tell us in your own words — or ask/);
});

test("desktop SORP uses one compact two-column guidance and response grammar", async () => {
  const conversation = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  const progress = await readFile(new URL("../app/sorp-journey.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/sorp-journey.css", import.meta.url), "utf8");
  assert.doesNotMatch(progress, /Stage \$\{current\} of \$\{stageCount\}/);
  assert.match(conversation, /function SorpStageContext/);
  assert.match(conversation, /className="sorp-bottom-utility"/);
  assert.match(styles, /@media\(min-width:901px\)[\s\S]*\.sorp-journey-body \{ grid-template-columns:minmax\(0,\.36fr\) minmax\(0,\.64fr\)/);
  assert.match(conversation, /className="sorp-response-fields"/);
});

test("SORP progress shows only completed, current and future states at the right time", async () => {
  const conversation = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  const progress = await readFile(new URL("../app/sorp-journey.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/sorp-journey.css", import.meta.url), "utf8");
  assert.match(conversation, /activeWorkflow\?\.next\.id === "publicSearchCheckpoint"/);
  assert.match(conversation, /isStageOnePayoff \? 1 : currentStage/);
  assert.match(conversation, /filter\(\(stage\) => stage !== 1\)/);
  assert.doesNotMatch(progress, /is-review-stage/);
  assert.doesNotMatch(styles, /is-review-stage/);
  assert.match(styles, /\.sorp-journey-progress li\.is-current > span \{ background:transparent; border-color:#11100f/);
  assert.match(styles, /\.sorp-journey-progress li\.is-complete \{ border-top-color:#34764f/);
});

test("SORP completion uses an opaque sticky header and document-flow build footer", async () => {
  const journeyStyles = await readFile(new URL("../app/sorp-journey.css", import.meta.url), "utf8");
  const globalStyles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(journeyStyles, /\.sorp-conversation-page > \.sorp-workspace-brand \{[^}]*background:#fbfaf7;[^}]*isolation:isolate;/);
  assert.match(journeyStyles, /\.sorp-conversation-page \.readiness-chat\.is-result-mode \{[^}]*height:auto;[^}]*overflow:visible;/);
  const buildStampRule = globalStyles.match(/\.global-build-stamp \{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(buildStampRule, /position\s*:\s*(?:fixed|sticky)/);
});

test("SORP working states describe the actual task and show restrained motion", async () => {
  const conversation = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  const styles = await readFile(new URL("../app/sorp-ready.css", import.meta.url), "utf8");
  assert.match(conversation, /Checking the Charity Commission record and latest public documents/);
  assert.match(conversation, /Looking again for the right organisation/);
  assert.match(conversation, /Checking the organisation’s public information and what applies/);
  assert.match(conversation, /Understanding your answer and checking the relevant SORP guidance/);
  assert.match(conversation, /Bringing your readiness report together/);
  assert.match(conversation, /role="status" aria-live="polite"/);
  assert.match(conversation, /className=\{busy \|\| quickAdvancing \? "is-working"/);
  assert.match(styles, /\.readiness-message\.is-loading > div \{[^}]*background: #f1f7ee;[^}]*color: #3d7650;/);
  assert.match(styles, /@keyframes readiness-working-button/);
  assert.match(styles, /@keyframes readiness-working-arrow/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("global and page navigation share one responsive header offset", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = await readFile(new URL("../app/site-shell.tsx", import.meta.url), "utf8");
  const productStyles = await Promise.all([
    "claims-code.css",
    "social-impact-excellence.css",
    "community-mapping.css",
    "purpose-works.css",
    "sorp-ready.css",
  ].map((file) => readFile(new URL(`../app/${file}`, import.meta.url), "utf8")));

  assert.match(shell, /--site-header-height/);
  assert.match(shell, /window\.addEventListener\("resize", syncHeader\)/);
  assert.match(css, /\.section-navigation \{[\s\S]*?inset: var\(--site-header-height\) 0 auto;/);
  assert.match(css, /\.cir-subnav \{[^}]*inset: var\(--site-header-height\) 0 auto;/);
  for (const styles of productStyles) assert.match(styles, /(?:inset|top):\s*var\(--site-header-height\)/);
});

test("product grid expands incomplete rows without leaving empty holes", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(css, /\.product-card:last-child:nth-child\(3n \+ 1\) \{ grid-column: 1 \/ -1; \}/);
  assert.match(css, /\.product-card:nth-last-child\(2\):nth-child\(3n \+ 1\)[\s\S]*?grid-column: span 3;/);
  assert.match(css, /\.product-card:last-child:nth-child\(odd\) \{ grid-column: 1 \/ -1; \}/);
  assert.match(css, /\.home-page \.product-mark\.logo-sorp \{[\s\S]*?background: var\(--yellow\) !important;/);
});

test("shared top navigation prioritises flagship work and groups the wider MSI offer", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const shell = await readFile(new URL("../app/site-shell.tsx", import.meta.url), "utf8");

  for (const href of [
    "/social-impact-excellence",
    "/social-impact-claims-code",
    "/are-you-sorp-ready",
    "/purpose-works",
    "/community-mapping",
    "/social-impact-report",
    "/blog",
    "/contact",
    "/#introduction",
    "/#values",
    "/#approach",
    "/#what-we-do",
    "/#team",
  ]) assert.match(shell, new RegExp(`href: "${href.replace("/", "\\/")}"`));
  assert.match(shell, /desktopLabel: "Claims Code"/);
  assert.match(shell, /desktopLabel: "SORP Ready\?"/);
  assert.match(shell, /<p>Products<\/p>/);
  assert.match(shell, /<p>About MSI<\/p>/);
  assert.match(shell, /<p>Featured<\/p>/);
  assert.match(shell, /<p>More from MSI<\/p>/);
  assert.match(shell, />Explore Assessments <span/);
  assert.doesNotMatch(shell, /Other Products/);
  assert.doesNotMatch(shell, /Festival Impact Reports/);
  assert.match(shell, /aria-controls="site-navigation"/);
  assert.match(shell, /id="site-navigation"/);
  assert.match(shell, /pathname\.startsWith\(`\$\{href\}\/`\)/);
  assert.match(css, /\.desktop-navigation \{[\s\S]*?display: flex;/);
  assert.match(css, /\.more-menu-panel \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.mobile-navigation \{[\s\S]*?grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 760px\) \{[\s\S]*?\.mobile-navigation \{ grid-template-columns: 1fr;/);
  assert.match(css, /\.site-header \.global-navigation,[\s\S]*?overflow-y: auto;[\s\S]*?overscroll-behavior: contain;/);
});

test("the Ideas Shed footer is a compact concrete-backed band", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const texture = await readFile(new URL("../public/assets/ideas-shed-concrete-wall.jpg", import.meta.url));
  assert.ok(texture.length > 100_000, "concrete texture is missing or unexpectedly small");
  assert.match(css, /background: #171717 url\("\/assets\/ideas-shed-concrete-wall\.jpg"\)/);
  assert.match(css, /grid-template-columns: minmax\(135px, 180px\)/);
  assert.match(css, /footer-ideas h2[^}]*font-family: var\(--font-sans\)[^}]*font-weight: 900/);
  assert.match(css, /border-left: 3px solid #ff1769/);
  assert.doesNotMatch(css, /\.site-footer \{ padding-block: clamp\(4\.5rem, 8vw, 8rem\)/);
});

test("server-renders the Are You SORP Ready product page", async () => {
  const response = await render("/are-you-sorp-ready");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Are You SORP Ready\? \| My Social Impact<\/title>/i);
  assert.match(html, /completely free SORP 2026 readiness tool/i);
  assert.match(html, /practical readiness report at the end/i);
  assert.match(html, /No payment\. No surprise paywall/i);
  assert.match(html, /Start your free readiness conversation/i);
  assert.match(html, /Start with a conversation/i);
  assert.match(html, /15-question Quick Snapshot/i);
  assert.doesNotMatch(html, /href="\/are-you-sorp-ready\/snapshot"/i);
  assert.match(html, /Start your free conversation/i);
  assert.doesNotMatch(html, /A useful result\. No account\. No email gate\./i);
  assert.doesNotMatch(html, /id="snapshot-tool"/i);
  assert.match(html, /href="\/are-you-sorp-ready\/conversation"/i);
  assert.match(html, /MUST \/ SHOULD \/ MAY/i);
  assert.match(html, /Judgement is an MSI explanatory category/i);
  assert.match(html, /Up to £500,000/i);
  assert.match(html, /Over £500,000 and up to £15 million/i);
  assert.match(html, /Over £15 million/i);
  assert.match(html, /Does SORP 2026/i);
  assert.match(html, /Charitable company ≠ CIC/i);
  assert.match(html, /Outside the UK/i);
  assert.match(html, /A conversation shaped/i);
  assert.match(html, /My Social Impact Intelligence/i);
  assert.match(html, /Illustrative front-end preview/i);
  assert.match(html, /£50/i);
  assert.match(html, /£100/i);
  assert.match(html, /£200/i);
  assert.match(html, /Small charity/i);
  assert.match(html, /Medium charity/i);
  assert.match(html, /Large charity/i);
  assert.match(html, /60-minute SORP 2026 Impact Readiness Review with My Social Impact/i);
  assert.match(html, /credit the cost of your review against that work/i);
  assert.match(html, /Impact Readiness Review/i);
  assert.match(html, /Optional paid human review/i);
  assert.match(html, /Cost genuinely a barrier/i);
  assert.match(html, /not a statutory audit/i);
  assert.doesNotMatch(html, /final 15-question method and scoring are still being developed/i);
});

test("server-renders the simple assessment hub", async () => {
  const response = await render("/assessments");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>Explore Assessments \| My Social Impact<\/title>/i);
  assert.match(html, /Which assessment[\s\S]*is right for you/i);
  assert.match(html, /Social Impact Maturity Assessment/i);
  assert.match(html, /Are you SORP ready/i);
  assert.match(html, /Explore Social Impact Excellence/i);
  assert.match(html, /Start your free SORP conversation/i);
  assert.match(html, /Explore SORP Readiness/i);
  assert.match(html, /href="\/social-impact-excellence"/i);
  assert.match(html, /href="\/are-you-sorp-ready"/i);
  assert.doesNotMatch(html, /href="https:\/\/platform\.mysocialimpact\.org\/snapshot"/i);
  assert.doesNotMatch(html, /href="\/are-you-sorp-ready\/snapshot"/i);
});

test("server-renders the focused SORP snapshot workspace", async () => {
  const response = await render("/are-you-sorp-ready/snapshot");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>SORP Ready Snapshot \| My Social Impact<\/title>/i);
  assert.match(html, /A quick route/i);
  assert.match(html, /The right context first/i);
  assert.match(html, /15-question snapshot/i);
  assert.match(html, /Find my organisation/i);
  assert.match(html, /no surprise paywall/i);
});

test("server-renders the dedicated SORP results workspace", async () => {
  const response = await render("/are-you-sorp-ready/results");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>Your SORP Ready Result \| My Social Impact<\/title>/i);
  assert.match(html, /Loading your result/i);
  assert.match(html, /Your SORP readiness result/i);
});

test("server-renders the conversational SORP readiness workspace", async () => {
  const response = await render("/are-you-sorp-ready/conversation");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>SORP Readiness Conversation \| My Social Impact<\/title>/i);
  assert.match(html, /Talk it through/i);
  assert.match(html, /Get your free report/i);
  assert.match(html, /Start my free conversation/i);
  assert.match(html, /My Social Impact Intelligence/i);
  assert.match(html, /15-question shortcut/i);

  const source = await readFile(new URL("../app/sorp-readiness-conversation.tsx", import.meta.url), "utf8");
  assert.match(source, /Let’s find your charity\./);
  assert.match(source, /What is the charity called\?/);
  assert.match(source, /why we’re asking and the SORP basis/);
  assert.match(source, /charityName/);
  assert.match(source, /readiness-message-heading/);
  assert.match(source, /readiness-message-list/);
  assert.match(source, /SorpResultActions/);
  const paymentSource = await readFile(new URL("../app/sorp-result-actions.tsx", import.meta.url), "utf8");
  assert.match(source, /is-result-mode/);
  assert.doesNotMatch(paymentSource, /7 stages complete · Stage 8 of 8/);
  assert.match(paymentSource, /Your Full Readiness Review/);
  assert.match(paymentSource, /developed SORP readiness assessment is ready/);
  assert.match(paymentSource, /Has this been useful\?/);
  assert.match(paymentSource, /Yes — very useful/);
  assert.match(paymentSource, /Yes — somewhat useful/);
  assert.match(paymentSource, /Not really/);
  assert.match(paymentSource, /No thanks — show my free report/);
  assert.match(paymentSource, /Print \/ save PDF/);
  assert.match(paymentSource, /Support the free tool/);
  assert.match(paymentSource, /not a charitable donation/i);
  assert.match(paymentSource, /Want a copy in your inbox\?/);
  assert.match(paymentSource, /report-email/);
  assert.match(paymentSource, /assessment_completed/);
  assert.match(paymentSource, /result_preview_viewed/);
  assert.match(paymentSource, /report_opened/);
  assert.match(paymentSource, /email_report_requested/);
  assert.match(paymentSource, /Optional human help/);
  assert.match(paymentSource, /credit the cost of your review against that work/);
  assert.match(paymentSource, /Cost genuinely a barrier/);
  assert.doesNotMatch(source, /where it is registered, its reporting year, approximate income/);
  assert.match(source, /sorp-stage-context is-organisation/);
  assert.doesNotMatch(source, /readiness-organisation-card/);
  assert.match(source, /Choose an answer/);
  assert.match(source, /Choose a quick answer/);
  assert.match(source, /Or tell us in your own words/);
  assert.match(source, /is-assessment-scale/);
  assert.match(source, /publicSearchCheckpoint/);
  assert.match(source, /Great — we found what we needed/);
  assert.match(source, /see my quick review/i);
  assert.match(source, /Trustees’ Annual Report/);
  assert.match(source, /wider impact evidence/i);
  assert.match(source, /historical starting point/);
  assert.match(source, /Happy with this answer\?/);
  assert.match(source, /Add a note in your own words — completely optional/);
  assert.match(source, /interaction: "confirm_structured_answer"/);
  assert.match(source, /structuredAnswerFromAction/);
  assert.match(source, /looksLikeQuestion/);
  assert.doesNotMatch(source.slice(source.indexOf("function selectStructuredAnswer"), source.indexOf("async function uploadReport")), /fetch\(/);
  assert.match(source, /Use microphone/);
  assert.match(source, /SorpKnownContext/);
  assert.match(source, /completedStages/);
  assert.match(source, /SorpJourneyProgress/);
  assert.match(source, /Charity register/);
  assert.match(source, /Companies House/);
  assert.match(source, /Website/);
  assert.doesNotMatch(source, /Registration number<\/dt>/);
  assert.doesNotMatch(source, /Latest reported income<\/dt>/);
  assert.match(source, /nextMessages\.slice\(-40\)/);
  assert.match(source, /SORP does not apply in the circumstances established/);
  assert.match(source, /Or tell us in your own words — or ask/);
  assert.match(source, /publicly_observed/);
  assert.match(source, /selectStructuredAnswer\(action\.value\)/);
  assert.match(source, /Choose all that apply\./);
  assert.match(source, /Continue with choices/);
  assert.match(source, /Select more than one if needed, then add a little detail below if it would help\./);
  assert.match(source, /Send message/);
  assert.match(source, /interaction\?: "conversation_first"/);
  assert.match(source, /sendMessage\(composer, composer, true, "conversation_first"\)/);
  assert.match(source, /draftActivitySelections/);
  assert.match(source, /state\.pendingStructuredAnswer && composer\.trim\(\)/);
  assert.doesNotMatch(source, /activityQuestion && looksLikeQuestion\(composer\)/);
  assert.match(source, /preserveActivitySelections/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /is-multi-select/);
  assert.match(source, /aria-label="Back to previous question"/);
  assert.match(source, /Create account and save/);
  assert.match(source, /Sign in and continue/);
  assert.match(source, /\/api\/readiness-account/);
  assert.match(source, /\/api\/readiness\/report/);
  assert.match(source, /UPLOAD_REPORT/);
  assert.match(source, /Already have an account\? Sign in\./);
  assert.match(source, /saved securely/);
  assert.match(source, /ConversationCheckpoint/);
  assert.match(source, /checkpoints/);
  assert.match(source, /Looking for the right organisation…/);
  assert.match(source, /MSI Intelligence/);
  assert.match(source, /SORP Intelligence/);
  assert.match(source, /Effective intelligence provenance/);
  assert.match(source, /Published intelligence only/);

  const proxy = await readFile(new URL("../app/api/readiness/route.ts", import.meta.url), "utf8");
  assert.match(proxy, /runtime = "nodejs"/);
  assert.match(proxy, /maxDuration = 60/);
  const accountProxy = await readFile(new URL("../app/api/readiness-account/route.ts", import.meta.url), "utf8");
  assert.match(accountProxy, /HttpOnly; Secure; SameSite=Lax/);
  assert.match(accountProxy, /paused sign-in attempts/);
  assert.match(accountProxy, /retrying temporary account service failure/);
  assert.match(accountProxy, /Your assessment is still safe on this device and nothing has been lost/);
  assert.match(source, /Sorry — we couldn’t save your account/);
  const reportProxy = await readFile(new URL("../app/api/readiness/report/route.ts", import.meta.url), "utf8");
  assert.match(reportProxy, /\/api\/readiness\/report/);
  assert.doesNotMatch(proxy, /OPENAI_API_KEY|authorization.*Bearer/i);
});

test("server-renders the Community Mapping product page", async () => {
  const response = await render("/community-mapping");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Community Mapping \| My Social Impact<\/title>/i);
  assert.match(html, /COMMUNITY MAPPING/i);
  assert.match(html, /Understand a community/i);
  assert.match(html, /Community Intelligence tells you what it means/i);
  assert.match(html, /People understand people/i);
  assert.match(html, /BREWERS DECORATING CENTRES/i);
  assert.match(html, /We have undertaken Community Mapping work/i);
  assert.doesNotMatch(html, /Members of the My Social Impact team/i);
  assert.doesNotMatch(html, /cm-process-line/i);
  assert.match(html, /YORK/i);
  assert.match(html, /CANTERBURY/i);
  assert.match(html, /SHREWSBURY/i);
  assert.match(html, /WELLINGBOROUGH/i);
  assert.match(html, /£3,000 – £10,000/i);
  assert.match(html, /mailto:marcus@mysocialimpact\.org/i);
  assert.match(html, /mailto:chris@mysocialimpact\.org/i);
  assert.match(html, /\/assets\/community-mapping-network\.png/i);
  assert.match(html, /href="\/social-impact-excellence"/i);
});

test("server-renders the Purpose Works page", async () => {
  const response = await render("/purpose-works");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Purpose Works \| My Social Impact<\/title>/i);
  assert.match(html, /specialist purpose, social impact marketing and communications offer/i);
  assert.match(html, /Trust is becoming a strategic asset/i);
  assert.match(html, /What they say/i);
  assert.match(html, /What they do/i);
  assert.match(html, /What they stand for/i);
  assert.match(html, /My Social Impact’s flagship methodology/i);
  assert.match(html, /Purpose Works is built on Social Impact Excellence/i);
  assert.match(html, /GIIN estimates the global impact investing market at \$1\.571 trillion in 2024/i);
  assert.match(html, /the market would approach \$5 trillion by 2030/i);
  assert.match(html, /UK \+ global thinking/i);
  assert.match(html, /Selected experience across the team/i);
  assert.match(html, /\/assets\/clients\/agrievolve\.png/i);
  assert.match(html, /\/assets\/clients\/diageo\.png/i);
  assert.match(html, /\/assets\/experience\/o2\.svg/i);
  assert.match(html, /\/assets\/experience\/hackney\.svg/i);
  assert.match(html, /\/assets\/experience\/stop-the-traffik\.svg/i);
  assert.match(html, /\/assets\/experience\/dlr\.svg/i);
  assert.match(html, /Procter &amp; Gamble/i);
  assert.match(html, /Unilever/i);
  assert.match(html, /Ricoh/i);
  assert.match(html, /\/assets\/experience\/starbucks\.svg/i);
  assert.match(html, /\/assets\/experience\/actionaid\.svg/i);
  assert.match(html, /\/assets\/experience\/traidcraft\.webp/i);
  assert.match(html, /Play showreel/i);
  assert.match(html, /\/assets\/showreel\/purpose-works-showreel-poster\.jpg/i);
  assert.match(html, /Social impact accounting asks whether impact can be substantiated/i);
  assert.match(html, /constructive critical friend/i);
  assert.match(html, /\/assets\/ideas-shed-logo-approved\.png/i);
  assert.match(html, /href="\/social-impact-excellence"/i);
  assert.match(html, /mailto:marcus@mysocialimpact\.org/i);
  assert.match(html, /mailto:chris@mysocialimpact\.org/i);
  assert.match(html, /Message us to request our showreel/i);
  assert.match(html, /Work delivered for organisations and brands over the years/i);
  assert.match(html, /id="showreel"/i);
  assert.match(html, /href="#showreel"/i);
  assert.doesNotMatch(html, /Creative Edge|Purpose Edge/i);
});

test("server-renders the Social Impact Claims Code page", async () => {
  const response = await render("/social-impact-claims-code");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Social Impact Claims Code \| My Social Impact<\/title>/i);
  assert.match(html, /If you say you’re making a difference, people should be able to trust what you say/i);
  assert.match(html, /Five principles for trustworthy impact claims/i);
  assert.match(html, /Make the strongest claim the evidence allows/i);
  assert.match(html, /mailto:chris@mysocialimpact.org/i);
  assert.match(html, /href="\/social-impact-excellence"/i);
});

test("server-renders the Social Impact Excellence page", async () => {
  const response = await render("/social-impact-excellence");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Social Impact Excellence \| My Social Impact<\/title>/i);
  assert.match(html, /Imagine a world where social impact was taken as seriously as financial performance/i);
  assert.match(html, /The Social Impact Excellence Blueprint/i);
  assert.match(html, /Data is often still the challenge/i);
  assert.match(html, /five-star journey/i);
  assert.match(html, /Start your Maturity Assessment today/i);
  assert.match(html, /10–15 minutes/i);
  assert.match(html, /href="https:\/\/platform\.mysocialimpact\.org\/snapshot"/i);
});
