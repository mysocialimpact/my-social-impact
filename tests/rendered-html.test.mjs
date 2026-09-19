import assert from "node:assert/strict";
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
  assert.ok(html.indexOf("Are You SORP Ready") < html.indexOf("Purpose Works"));
  assert.match(html, /href="\/purpose-works"/i);
  assert.match(html, /href="\/community-mapping"/i);
  assert.match(html, /COMMUNITY MAPPING/i);
  assert.match(html, /\/assets\/ideas-shed-logo\.png/i);
  assert.match(html, /Start your Social Impact Maturity Assessment today/i);
  assert.match(html, /Start Maturity Assessment/i);
  assert.match(html, /href="https:\/\/platform\.mysocialimpact\.org\/snapshot"/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("server-renders the Are You SORP Ready product page", async () => {
  const response = await render("/are-you-sorp-ready");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Are You SORP Ready\? \| My Social Impact<\/title>/i);
  assert.match(html, /SORP 2026 changes what many charities need to report about their impact/i);
  assert.match(html, /Same assessment/i);
  assert.match(html, /Two ways to do it/i);
  assert.match(html, /15 core questions/i);
  assert.match(html, /href="\/are-you-sorp-ready\/snapshot"/i);
  assert.doesNotMatch(html, /A useful result\. No account\. No email gate\./i);
  assert.doesNotMatch(html, /id="snapshot-tool"/i);
  assert.match(html, /https:\/\/sorp2026\.mysocialimpact\.org/i);
  assert.match(html, /MUST \/ SHOULD \/ MAY/i);
  assert.match(html, /Judgement is an MSI explanatory category/i);
  assert.match(html, /Up to £500,000/i);
  assert.match(html, /Over £500,000 and up to £15 million/i);
  assert.match(html, /Over £15 million/i);
  assert.match(html, /Illustrative front-end preview/i);
  assert.match(html, /£50/i);
  assert.match(html, /Impact Readiness Review/i);
  assert.match(html, /not a statutory audit/i);
  assert.doesNotMatch(html, /final 15-question method and scoring are still being developed/i);
});

test("server-renders the focused SORP snapshot workspace", async () => {
  const response = await render("/are-you-sorp-ready/snapshot");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>SORP Ready Snapshot \| My Social Impact<\/title>/i);
  assert.match(html, /A useful result\. No account\. No email gate\./i);
  assert.match(html, /Five short setup questions/i);
  assert.match(html, /same 15 impact-readiness questions/i);
  assert.match(html, /Start my snapshot/i);
  assert.match(html, /Save &amp; exit/i);
  assert.match(html, /id="snapshot-tool"/i);
});

test("server-renders the dedicated SORP results workspace", async () => {
  const response = await render("/are-you-sorp-ready/results");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<title>Your SORP Ready Result \| My Social Impact<\/title>/i);
  assert.match(html, /Loading your result/i);
  assert.match(html, /Your impact-readiness result/i);
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
  assert.match(html, /\/assets\/ideas-shed-logo\.png/i);
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
