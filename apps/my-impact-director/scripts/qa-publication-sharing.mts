import fs from "node:fs/promises";
import { randomUUID, randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { database, query } from "../src/lib/db";
import { tokenHash, EMAIL_COOKIE } from "../src/lib/access";
// Use the dedicated validation database and a local application built against it.
const base = process.env.QA_BASE || "http://localhost:3078";
if (
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  new URL(process.env.DATABASE_URL!).pathname !==
    "/my_impact_director_validation"
)
  throw Error("Use local validation fixtures.");
const tag = "qa-publication-" + randomUUID(),
  session = randomBytes(32).toString("base64url"),
  doc = randomUUID();
const b = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  await query(
    "INSERT INTO director.users(id,email,name,email_verified_at) VALUES ($1,$2,'Publication QA',now())",
    [tag, tag + "@example.invalid"],
  );
  await query(
    "INSERT INTO director.access_sessions(token_hash,owner_id,kind,expires_at) VALUES ($1,$2,'email',now()+interval '20 minutes')",
    [tokenHash(session), tag],
  );
  await query(
    "INSERT INTO director.reports(id,owner_id,title,sha256,file_bytes,consent_version,understanding_ready) VALUES ($1,$2,'Synthetic QA report',$3,$4,'internal-qa',true)",
    [doc, tag, tag, Buffer.from("synthetic")],
  );
  const ids: Record<string, string> = {};
  for (const f of ["claims", "excellence", "report"]) {
    const data = JSON.parse(
      await fs.readFile("artifacts/" + f + "-review.json", "utf8"),
    ).result;
    const id = randomUUID();
    ids[f] = id;
    await query(
      "INSERT INTO director.reviews(id,report_id,version,framework,status,result) VALUES($1,$2,$3,$4,'complete',$5)",
      [id, doc, data.version + "-" + f, f, JSON.stringify(data)],
    );
    await query(
      "INSERT INTO director.review_grants(review_id,owner_id) VALUES($1,$2)",
      [id, tag],
    );
  }
  const owner = await b.newContext({ viewport: { width: 1440, height: 900 } }),
    viewer = await b.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
  await owner.addCookies([
    {
      url: base,
      name: EMAIL_COOKIE,
      value: session,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const p = await owner.newPage(),
    q = await viewer.newPage();
  p.setDefaultTimeout(18000);
  q.setDefaultTimeout(18000);
  await q.goto(base + "/open/" + ids.claims);
  assert.equal(new URL(q.url()).pathname, "/login");
  for (const [f, id] of Object.entries(ids)) {
    await p.goto(base + "/open/" + id);
    await p.locator(".pub-cover").waitFor();
    await p.getByRole("heading", { name: "Private to you." }).waitFor();
    assert.equal(await p.locator('a[href$="/export"]').count(), 0);
    await p.getByRole("button", { name: "Create sharing link" }).click();
    const field = p.getByLabel("Read-only sharing link");
    await field.waitFor();
    const url = await field.inputValue();
    await q.goto(url);
    await q.locator(".pub-cover").waitFor();
    assert.equal(await q.locator(".pub-scores h3").count(), 5);
    assert.equal(await q.locator(".pub-priorities li").count(), 3);
    assert.equal(await q.locator("#share-report").count(), 0);
    await q
      .locator(".publication-nav")
      .getByRole("link", { name: "Evidence" })
      .click();
    assert.equal(q.url(), url);
    assert.equal(
      await q.locator("#supporting-evidence").getAttribute("open"),
      "",
    );
    const denied = await q.request.get(
      base + "/api/reviews/" + id + "/sharing",
    );
    assert.ok([401, 403].includes(denied.status()));
    await p.reload();
    await p.getByRole("button", { name: "Revoke link" }).click();
    await p.getByRole("heading", { name: "Private to you." }).waitFor();
    await q.evaluate(() => window.dispatchEvent(new Event("focus")));
    await q.getByText(/could not be opened/).waitFor();
    await q.reload();
    await q.getByText(/could not be opened/).waitFor();
    await p.reload();
    await p.locator(".pub-cover").waitFor();
    console.log(
      f,
      "private owner email destination, share, clean mobile reader, evidence navigation, reload, revoke and revisit passed",
    );
  }
} finally {
  await b.close();
  await query("DELETE FROM director.reports WHERE id=$1 AND owner_id=$2", [
    doc,
    tag,
  ]);
  await query("DELETE FROM director.users WHERE id=$1", [tag]);
  await database().end();
}
