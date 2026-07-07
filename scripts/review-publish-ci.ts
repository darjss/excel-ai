import { createId } from "@paralleldrive/cuid2";
import { wholesaleConfig } from "../src/portal-config/fixtures/wholesale";

const BASE = process.env.REVIEW_CI_BASE ?? "http://localhost:5321";

let failures = 0;
const check = (label: string, condition: boolean, detail?: string): void => {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${label}${detail !== undefined ? ` — ${detail}` : ""}`);
};

const cookieHeader = (raw: string[]): string =>
  raw.map((entry) => entry.split(";")[0]).join("; ");

const PASSWORD = "password12345";

const signUp = async (email: string): Promise<string> => {
  const created = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ name: email.split("@")[0], email, password: PASSWORD }),
  });
  const signUpCookies = created.headers.getSetCookie();
  if (created.ok && signUpCookies.length > 0) return cookieHeader(signUpCookies);

  const signedIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!signedIn.ok) throw new Error(`auth failed: ${signedIn.status} ${await signedIn.text()}`);
  return cookieHeader(signedIn.headers.getSetCookie());
};

const seed = async (jobId: string): Promise<Response> =>
  fetch(`${BASE}/api/extraction/${jobId}/seed`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify(wholesaleConfig),
  });

const claim = (jobId: string, cookie: string): Promise<Response> =>
  fetch(`${BASE}/api/review/${jobId}/claim`, {
    method: "POST",
    headers: { cookie, origin: BASE },
  });

const draft = async (jobId: string, cookie: string) => {
  const response = await fetch(`${BASE}/api/review/${jobId}/draft`, { headers: { cookie } });
  return response.json() as Promise<{
    published: boolean;
    slug: string | null;
    config: { rules: { id: string }[]; business: { name: string } };
    summary: { confirmed: number; questions: number };
  }>;
};

const decide = (jobId: string, cookie: string, findingId: string, accepted: boolean) =>
  fetch(`${BASE}/api/review/${jobId}/finding`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ findingId, accepted }),
  });

const publish = (jobId: string, cookie: string, slug: string) =>
  fetch(`${BASE}/api/review/${jobId}/publish`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ slug }),
  });

const ruleIds = (config: { rules: { id: string }[] }): string[] =>
  config.rules.map((rule) => rule.id);

const run = async (): Promise<void> => {
  const stamp = Date.now();
  const slug = `northgate-${stamp}`;

  console.log("review-publish-ci: claim → review → publish over the live Elysia app\n");

  console.log("setup");
  const alice = await signUp(`alice-${stamp}@example.com`);
  const bob = await signUp(`bob-${stamp}@example.com`);
  check("signed up two users", alice.length > 0 && bob.length > 0);

  const jobId = createId();
  const seeded = await seed(jobId);
  check("seeds a draft without live extraction", seeded.status === 202, `status ${seeded.status}`);

  console.log("\nclaim flow");
  const anonClaim = await claim(jobId, "");
  check("anonymous claim is rejected", anonClaim.status === 401, `status ${anonClaim.status}`);

  const aliceClaim = await claim(jobId, alice);
  check("owner can claim", aliceClaim.status === 200, `status ${aliceClaim.status}`);

  const bobClaim = await claim(jobId, bob);
  check("second claimant is forbidden", bobClaim.status === 403, `status ${bobClaim.status}`);

  const aliceReclaim = await claim(jobId, alice);
  check("re-claim by owner is idempotent", aliceReclaim.status === 200, `status ${aliceReclaim.status}`);

  console.log("\nreview mutations");
  const initial = await draft(jobId, alice);
  check("unconfirmed tax question hides its rule", !ruleIds(initial.config).includes("sales-tax"));
  check("keeps confirmed rules", ruleIds(initial.config).includes("tier-flour"));
  check("summary reports one open question", initial.summary.questions === 1, JSON.stringify(initial.summary));

  console.log("\npublish is blocked while a question is open");
  const blocked = await publish(jobId, alice, slug);
  const blockedBody = (await blocked.json()) as { error?: { details?: { openQuestions?: number } } };
  check("publish with an open question is 422", blocked.status === 422, `status ${blocked.status}`);
  check(
    "422 reports the open-question count",
    blockedBody.error?.details?.openQuestions === 1,
    JSON.stringify(blockedBody),
  );

  await decide(jobId, alice, "f-tax", true);
  const confirmed = await draft(jobId, alice);
  check("confirming the tax question restores its rule", ruleIds(confirmed.config).includes("sales-tax"));
  check("no questions remain after confirming", confirmed.summary.questions === 0);

  await decide(jobId, alice, "f-tier-flour", false);
  const rejected = await draft(jobId, alice);
  check("rejecting a rule-finding removes its rule", !ruleIds(rejected.config).includes("tier-flour"));
  check("a rejected finding is not an open question", rejected.summary.questions === 0);

  const unknown = await decide(jobId, alice, "does-not-exist", true);
  check("unknown finding id is a 404", unknown.status === 404, `status ${unknown.status}`);

  console.log("\npublish");
  const badSlug = await fetch(`${BASE}/api/review/slug-available?slug=app`, { headers: { cookie: alice } });
  const badSlugBody = (await badSlug.json()) as { valid: boolean };
  check("reserved slug is invalid", badSlugBody.valid === false);

  const freeSlug = await fetch(`${BASE}/api/review/slug-available?slug=${slug}`, { headers: { cookie: alice } });
  const freeSlugBody = (await freeSlug.json()) as { available: boolean };
  check("fresh slug is available", freeSlugBody.available === true);

  const published = await publish(jobId, alice, slug);
  const publishedBody = (await published.json()) as { slug?: string; portalUrl?: string };
  check("publish succeeds", published.status === 200, `status ${published.status}`);
  check("publish returns the portal url", publishedBody.portalUrl?.includes(slug) === true, publishedBody.portalUrl);

  const afterPublish = await draft(jobId, alice);
  check("draft is flagged published with its slug", afterPublish.published && afterPublish.slug === slug);

  console.log("\npublished portal renders");
  const portal = await fetch(`${BASE}/portal/${slug}`);
  const portalHtml = await portal.text();
  check("published portal home returns 200", portal.status === 200, `status ${portal.status}`);
  check("portal home renders the business name", portalHtml.includes("Northgate Provisions"));

  console.log("\npublish is once-only");
  const beta = `${slug}-beta`;
  const rePublish = await publish(jobId, alice, beta);
  check("re-publishing an already-published draft is 409", rePublish.status === 409, `status ${rePublish.status}`);

  const alphaStill = await fetch(`${BASE}/portal/${slug}`);
  check("the original slug stays live after a rejected re-publish", alphaStill.status === 200, `status ${alphaStill.status}`);

  const alphaAvail = await fetch(`${BASE}/api/review/slug-available?slug=${slug}`, { headers: { cookie: alice } });
  const alphaAvailBody = (await alphaAvail.json()) as { available: boolean };
  check("the published slug stays taken", alphaAvailBody.available === false);

  const betaAvail = await fetch(`${BASE}/api/review/slug-available?slug=${beta}`, { headers: { cookie: alice } });
  const betaAvailBody = (await betaAvail.json()) as { available: boolean };
  check("the rejected new slug was never reserved", betaAvailBody.available === true);

  console.log("\nsse read lock after claim");
  const jobThree = createId();
  await seed(jobThree);
  const anonBeforeClaim = await fetch(`${BASE}/api/extraction/${jobThree}/events`);
  check("unclaimed events stream is public", anonBeforeClaim.status === 200, `status ${anonBeforeClaim.status}`);
  await anonBeforeClaim.body?.cancel();

  await claim(jobThree, alice);
  const bobEvents = await fetch(`${BASE}/api/extraction/${jobThree}/events`, { headers: { cookie: bob } });
  check("non-owner events after claim is 403", bobEvents.status === 403, `status ${bobEvents.status}`);
  await bobEvents.body?.cancel();

  const anonAfterClaim = await fetch(`${BASE}/api/extraction/${jobThree}/events`);
  check("anonymous events after claim is 403", anonAfterClaim.status === 403, `status ${anonAfterClaim.status}`);
  await anonAfterClaim.body?.cancel();

  const ownerEvents = await fetch(`${BASE}/api/extraction/${jobThree}/events`, { headers: { cookie: alice } });
  check("owner keeps events access after claim", ownerEvents.status === 200, `status ${ownerEvents.status}`);
  await ownerEvents.body?.cancel();

  console.log("\nslug uniqueness");
  const carol = await signUp(`carol-${stamp}@example.com`);
  const jobTwo = createId();
  await seed(jobTwo);
  await claim(jobTwo, carol);
  await decide(jobTwo, carol, "f-tax", true);
  const conflict = await publish(jobTwo, carol, slug);
  check("a taken slug is a 409 conflict", conflict.status === 409, `status ${conflict.status}`);

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing assertion(s)`);
  if (failures > 0) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
