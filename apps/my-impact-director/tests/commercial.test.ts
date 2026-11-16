import { test } from "node:test";
import assert from "node:assert/strict";
import {
  serviceMailto,
  contactService,
  contactContext,
  serviceContactUrl,
  activeServices,
  supportTiers,
  novemberOfferActive,
} from "../src/lib/services";
test("commercial email subjects and prices stay precise without private document data", () => {
  for (const [service, subject] of [
    ["discussion", "Discuss my impact report"],
    ["improvement", "Improve or digitise my report"],
    ["digitisation", "Digitise my impact report"],
    ["preparation", "Prepare my next impact report"],
    ["supported", "Ongoing support enquiry"],
  ] as const) {
    const url = new URL(serviceMailto(service));
    assert.equal(url.pathname, "marcus@mysocialimpact.org");
    assert.equal(
      url.searchParams.get("subject"),
      "My Impact Director — " + subject,
    );
    assert.deepEqual([...url.searchParams.keys()], ["subject"]);
  }
  assert.deepEqual(
    supportTiers.map((t) => [t.name, t.price]),
    [
      ["Supported", "£149"],
      ["Director", "£495"],
      ["Bespoke", "£1,500"],
    ],
  );
  assert.ok(!activeServices.some(([id]) => id === "essentials"));
});
test("published November promotion expires automatically", () => {
  assert.equal(novemberOfferActive(new Date("2026-11-30T23:59:59Z")), true);
  assert.equal(novemberOfferActive(new Date("2026-12-01T00:00:00Z")), false);
  assert.equal(novemberOfferActive(new Date("2026-10-31T23:59:59Z")), false);
});

test("contact context accepts only known services and never includes private report content", () => {
  for (const value of [
    undefined,
    ["improvement"],
    "__proto__",
    "<script>",
    "essentials",
    "https://evil.example",
  ])
    assert.equal(contactService(value), "discussion");
  assert.equal(contactService("improvement"), "improvement");
  assert.equal(
    serviceContactUrl("improvement"),
    "/contact?service=improvement",
  );
  assert.equal(contactContext("improvement"), "Improve or digitise my report");
  assert.match(
    contactContext("director"),
    /ongoing Impact Director support · Director/,
  );
});
