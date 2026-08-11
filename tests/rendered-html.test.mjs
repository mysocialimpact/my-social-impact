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
  assert.match(html, /href="\/social-impact-claims-code"/i);
  assert.match(html, /href="\/social-impact-excellence"/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
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
  assert.match(html, /Get access to the Maturity Assessment/i);
});
