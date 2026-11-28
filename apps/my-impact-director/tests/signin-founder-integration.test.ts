import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { serializeSignedCookie } from "better-call";
import { database, query, transaction } from "../src/lib/db";
import {
  resolveVerifiedAccount,
  hydrateVerifiedIdentity,
} from "../src/lib/verified-account";
import { FOUNDER_OWNER, FOUNDER_EMAILS } from "../src/lib/founder-policy";
import { getSocialAuth } from "../src/lib/social-auth";
import { identity, founder, accountAction } from "../src/lib/auth";
import { tokenHash, accessCookie, EMAIL_COOKIE } from "../src/lib/access";
import {
  prepareWorkspaceLink,
  connectOwnedWorkspace,
} from "../src/lib/workspace-link";
import { archiveKnownTest } from "../src/lib/account-cleanup";
import { getReview } from "../src/lib/reviews";
import {
  founderOverview,
  founderAccounts,
  founderActivity,
  founderReviews,
  founderEnquiries,
  founderCosts,
  PAID_STATUS_SQL,
} from "../src/lib/founder-data";
import { GET as founderAPI } from "../src/app/api/founder/route";
import type { Identity } from "../src/lib/auth";
test(
  "verified sign-in, workspace linking, founder isolation and real dashboard queries",
  { skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 120000 },
  async () => {
    assert.equal(
      new URL(process.env.DATABASE_URL!).pathname,
      "/my_impact_director_validation",
    );
    const prefix = "signin-qa-" + randomUUID(),
      email = prefix + "@example.invalid",
      users: string[] = [],
      socialUsers: string[] = [];
    const req = (cookie = "", method = "GET") =>
      new Request("http://localhost:3000/api/account", {
        method,
        headers: { cookie, origin: "http://localhost:3000" },
      });
    const makeEmailSession = async (id: string, verifiedEmail?: string) => {
      const token = randomBytes(32).toString("base64url");
      await query(
        "INSERT INTO director.access_sessions(token_hash,owner_id,kind,expires_at,verified_email) VALUES($1,$2,'email',now()+interval '1 hour',$3)",
        [tokenHash(token), id, verifiedEmail || null],
      );
      return accessCookie(token, 3600, EMAIL_COOKIE).split(";")[0];
    };
    let createdFounder = false;
    const proofHashes: string[] = [];
    try {
      const unverified = prefix + "-claimed";
      users.push(unverified);
      await query(
        "INSERT INTO director.users(id,email,name) VALUES($1,$2,'Claimed email')",
        [unverified, email],
      );
      const real = await transaction((c) =>
        resolveVerifiedAccount(c, email, "Verified user"),
      );
      users.push(real);
      assert.notEqual(
        real,
        unverified,
        "unverified matching email must not merge",
      );
      const again = await transaction((c) =>
        resolveVerifiedAccount(c, email, "Verified user"),
      );
      assert.equal(real, again);
      const realCookie = await makeEmailSession(real);
      const user = await identity(req(realCookie));
      assert.equal(user.id, real);
      assert.equal(user.founder, false);
      assert.equal(
        (
          await founderAPI(
            new Request("http://localhost:3000/api/founder", {
              headers: { cookie: realCookie },
            }),
          )
        ).status,
        403,
      );
      assert.equal((await founderAPI(req())).status, 401);
      const forged = await makeEmailSession(unverified);
      await assert.rejects(() => founder(req(forged)));
      // Library-verifiable session, not a hand-rolled application JWT. No live provider exchange is mocked as an OAuth test.
      const auth = await getSocialAuth(req());
      const context = await auth.$context;
      const social = await context.internalAdapter.createUser(
        {
          email: prefix + "-google@example.invalid",
          name: "QA social",
          emailVerified: true,
        },
        { method: "oauth" },
      );
      socialUsers.push(social.id);
      await query(
        `INSERT INTO director.auth_accounts(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES($1,$2,'google',$3,now(),now())`,
        [randomUUID(), prefix, social.id],
      );
      const session = await context.internalAdapter.createSession(social.id);
      assert.ok(session);
      const signed = (
        await serializeSignedCookie(
          "mid-auth.session_token",
          session.token,
          process.env.AUTH_SECRET!,
        )
      ).split(";")[0];
      const socialUser = await identity(req(signed));
      users.push(socialUser.id);
      assert.equal(socialUser.emailVerified, true);
      assert.equal(socialUser.socialAccount, true);
      assert.equal(socialUser.founder, false);
      const invalid = await identity(
        req("mid-auth.session_token=forged"),
      ).catch(() => null);
      assert.equal(invalid, null);
      const old = prefix + "-old";
      users.push(old);
      await query(
        "INSERT INTO director.users(id,email,name) VALUES($1,$2,'Old workspace')",
        [old, prefix + "-old@example.invalid"],
      );
      const [report] = await query<{ id: string }>(
        "INSERT INTO director.reports(owner_id,title,sha256,file_bytes,consent_version) VALUES($1,'QA private document',$2,$3,'qa') RETURNING id",
        [old, prefix, Buffer.from("%PDF-1.4\n")],
      );
      const [review] = await query<{ id: string }>(
        "INSERT INTO director.reviews(report_id,version,framework) VALUES($1,'qa-signin','document') RETURNING id",
        [report.id],
      );
      await assert.rejects(() => getReview(user, review.id));
      const proof = await prepareWorkspaceLink({
        id: old,
        email: prefix + "-old@example.invalid",
        name: "Old",
        founder: false,
        passwordAccount: true,
      });
      await connectOwnedWorkspace(
        req(realCookie + "; " + proof.split(";")[0]),
        user,
      );
      const linked = await identity(req(realCookie));
      assert.ok(await getReview(linked, review.id));
      const [retired] = await query<{ retired_at: string | null }>(
        "SELECT retired_at FROM director.users WHERE id=$1",
        [old],
      );
      assert.ok(retired.retired_at);
      await connectOwnedWorkspace(
        req(realCookie + "; " + proof.split(";")[0]),
        user,
      ); // proof idempotent
      await assert.rejects(() =>
        hydrateVerifiedIdentity({
          id: old,
          email: prefix + "-old@example.invalid",
          name: "Old",
          founder: false,
          emailVerified: true,
        }),
      );
      const recycled = await transaction((c) =>
        resolveVerifiedAccount(
          c,
          prefix + "-old@example.invalid",
          "Fresh email owner",
        ),
      );
      users.push(recycled);
      assert.notEqual(
        recycled,
        real,
        "retired workspace aliases cannot be reactivated through an email match",
      );
      const testId = "qa_direct_openai_" + randomUUID();
      users.push(testId);
      await query(
        "INSERT INTO director.users(id,email,name) VALUES($1,$2,'Archive QA')",
        [testId, prefix + "-archive@example.invalid"],
      );
      await makeEmailSession(testId);
      assert.equal(await archiveKnownTest(testId, "qa:signin-test"), true);
      assert.equal(await archiveKnownTest(testId, "qa:signin-test"), false);
      const [testState] = await query<{
        account_class: string;
        retired_at: string | null;
        live_sessions: number;
      }>(
        "SELECT account_class,retired_at,(SELECT count(*)::int FROM director.access_sessions WHERE owner_id=$1 AND expires_at>now()) AS live_sessions FROM director.users WHERE id=$1",
        [testId],
      );
      assert.equal(testState.account_class, "test");
      assert.ok(testState.retired_at);
      assert.equal(testState.live_sessions, 0);
      const joinNormal = await prepareWorkspaceLink(
        await identity(req(realCookie)),
      );
      await connectOwnedWorkspace(
        req(signed + "; " + joinNormal.split(";")[0]),
        socialUser,
      );
      const restoredOwner = await transaction((c) =>
        resolveVerifiedAccount(c, email),
      );
      assert.equal(
        restoredOwner,
        socialUser.id,
        "a previously verified email must still restore the linked account after its old workspace is retired",
      );
      const aliasCookie = await makeEmailSession(restoredOwner, email);
      const aliasIdentity = await identity(req(aliasCookie));
      assert.equal(
        aliasIdentity.email,
        email,
        "remember the address proved by this sign-in, independently of the canonical profile email",
      );
      assert.equal(aliasIdentity.id, socialUser.id);
      assert.equal(aliasIdentity.emailVerified, true);
      // Do not mutate the real founder fixture in this shared validation DB: roll back the identity resolution transaction.
      const c = await database().connect();
      try {
        await c.query("BEGIN");
        for (const address of FOUNDER_EMAILS)
          assert.equal(
            await resolveVerifiedAccount(c, address, "Marcus"),
            FOUNDER_OWNER,
          );
        await c.query("ROLLBACK");
      } finally {
        c.release();
      }
      // Simulate the already-verified Founder session and a separately verified
      // Apple-style private relay identity. Real OAuth exchange is a deployment gate.
      const seeded = await query(
        "INSERT INTO director.users(id,email,name,email_verified_at,canonical_owner_id,account_class) VALUES($1,$2,'QA Founder role fixture',now(),$1,'founder') ON CONFLICT(id) DO NOTHING RETURNING id",
        [FOUNDER_OWNER, prefix + "-founder@example.invalid"],
      );
      createdFounder = seeded.length > 0;
      const founderCookie = await makeEmailSession(FOUNDER_OWNER);
      assert.equal((await founderAPI(req(founderCookie))).status, 200);
      const founderUser = await identity(req(founderCookie));
      const founderLink = await prepareWorkspaceLink(founderUser);
      proofHashes.push(tokenHash(founderLink.split(";")[0].split("=")[1]));
      const mergedFounder = await connectOwnedWorkspace(
        req(signed + "; " + founderLink.split(";")[0]),
        socialUser,
      );
      assert.equal(mergedFounder.id, FOUNDER_OWNER);
      assert.equal(mergedFounder.founder, true);
      assert.equal((await identity(req(signed))).id, FOUNDER_OWNER);
      const overview = await founderOverview();
      assert.ok(Number(overview.metrics.accounts) >= 1);
      assert.equal(overview.funnel[0].rate, null);
      for (const data of [
        await founderAccounts(prefix, 1),
        await founderActivity(prefix, 30),
        await founderReviews("", "", 30, ""),
        await founderEnquiries("", "", 30, ""),
        await founderCosts(30),
      ])
        assert.ok(data);
      // SQL totals must exclude failed records even if a corrupt historical paid_at is present.
      const [calc] = await query(
        `WITH p(amount_pence,refunded_pence,status,paid_at) AS (VALUES (1000,0,'succeeded',now()),(9000,0,'failed',now()),(500,100,'partially_refunded',now()),(700,700,'refunded',now()),(800,0,'pending',NULL::timestamptz)) SELECT sum(amount_pence) FILTER(WHERE ${PAID_STATUS_SQL}) AS gross,sum(refunded_pence) FILTER(WHERE ${PAID_STATUS_SQL}) AS refunded FROM p`,
      );
      assert.equal(Number(calc.gross), 2200);
      assert.equal(Number(calc.refunded), 800);
      const out = await accountAction(req(signed, "POST"), {
        action: "logout",
      });
      assert.equal(out.status, 200);
      assert.equal(
        await (
          await getSocialAuth(req())
        ).api.getSession({ headers: new Headers({ cookie: signed }) }),
        null,
      );
    } finally {
      await query(
        "DELETE FROM director.reports WHERE owner_id=ANY($1::text[])",
        [users],
      );
      await query("DELETE FROM director.audit WHERE actor_id=ANY($1::text[])", [
        users,
      ]);
      await query(
        "DELETE FROM director.workspace_link_proofs WHERE owner_id=ANY($1::text[]) OR token_hash=ANY($2::text[])",
        [users, proofHashes],
      );
      await query("DELETE FROM director.auth_users WHERE id=ANY($1::text[])", [
        socialUsers,
      ]);
      await query(
        "DELETE FROM director.verified_addresses WHERE owner_id=ANY($1::text[]) OR email LIKE $2",
        [users, prefix + "%"],
      );
      await query("DELETE FROM director.users WHERE id=ANY($1::text[])", [
        users,
      ]);
      if (createdFounder)
        await query(
          "DELETE FROM director.verified_addresses WHERE owner_id=$1 AND email LIKE $2",
          [FOUNDER_OWNER, prefix + "%"],
        );
      if (createdFounder)
        await query(
          "DELETE FROM director.users u WHERE id=$1 AND email=$2 AND NOT EXISTS(SELECT 1 FROM director.users a WHERE a.canonical_owner_id=$1 AND a.id<>$1) AND NOT EXISTS(SELECT 1 FROM director.reports WHERE owner_id=$1) AND NOT EXISTS(SELECT 1 FROM director.auth_principals WHERE owner_id=$1)",
          [FOUNDER_OWNER, prefix + "-founder@example.invalid"],
        );
      await database().end();
    }
  },
);
