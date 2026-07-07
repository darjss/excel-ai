import { createId } from "@paralleldrive/cuid2";
import { wholesaleConfig } from "../src/portal-config/fixtures/wholesale";

const BASE = process.env.BILLING_CI_BASE ?? "http://localhost:5321";
const MODE = process.env.BILLING_CI_MODE ?? "paywall";
const EXPECT_BADGE = process.env.BILLING_CI_EXPECT_BADGE ?? "present";

let failures = 0;
const check = (label: string, condition: boolean, detail?: string): void => {
  if (condition) {
    console.log(`  ok   ${label}`);
    return;
  }
  failures += 1;
  console.log(`  FAIL ${label}${detail !== undefined ? ` — ${detail}` : ""}`);
};

const cookieHeader = (raw: string[]): string => raw.map((entry) => entry.split(";")[0]).join("; ");

const PASSWORD = "password12345";

const signUp = async (email: string): Promise<string> => {
  const created = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ name: email.split("@")[0], email, password: PASSWORD }),
  });
  const cookies = created.headers.getSetCookie();
  if (created.ok && cookies.length > 0) return cookieHeader(cookies);

  const signedIn = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!signedIn.ok) throw new Error(`auth failed: ${signedIn.status} ${await signedIn.text()}`);
  return cookieHeader(signedIn.headers.getSetCookie());
};

const seed = (jobId: string): Promise<Response> =>
  fetch(`${BASE}/api/extraction/${jobId}/seed`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE },
    body: JSON.stringify(wholesaleConfig),
  });

const claim = (jobId: string, cookie: string): Promise<Response> =>
  fetch(`${BASE}/api/review/${jobId}/claim`, { method: "POST", headers: { cookie, origin: BASE } });

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

const run = async (): Promise<void> => {
  const stamp = Date.now();
  const slug = `billing-${stamp}`;
  console.log(`billing-ci (mode=${MODE}): publish paywall over the live Elysia app\n`);

  const cookie = await signUp(`billing-${stamp}@example.com`);
  const jobId = createId();
  await seed(jobId);
  await claim(jobId, cookie);
  await decide(jobId, cookie, "f-tax", true);

  const response = await publish(jobId, cookie, slug);

  if (MODE === "bypass") {
    check("publish succeeds with a simulated subscription", response.status === 200, `status ${response.status}`);
    const portal = await fetch(`${BASE}/portal/${slug}`);
    const html = await portal.text();
    check("published portal renders", portal.status === 200, `status ${portal.status}`);
    const hasBadge = html.includes("Made with Sheetstand");
    check(
      `badge is ${EXPECT_BADGE} for the stamped tier`,
      EXPECT_BADGE === "present" ? hasBadge : !hasBadge,
      `hasBadge=${hasBadge}`,
    );
  } else {
    const body = (await response.json()) as {
      error?: { code?: string; details?: { checkoutPath?: string; plans?: { slug: string }[] } };
    };
    check("publish without a subscription is 402", response.status === 402, `status ${response.status}`);
    check("402 carries the payment_required code", body.error?.code === "payment_required", JSON.stringify(body));
    check(
      "402 carries the checkout path",
      body.error?.details?.checkoutPath === "/api/billing/checkout",
      JSON.stringify(body.error?.details),
    );
    check(
      "402 lists both plans",
      body.error?.details?.plans?.map((plan) => plan.slug).join(",") === "standard,pro",
      JSON.stringify(body.error?.details?.plans),
    );

    const state = await fetch(`${BASE}/api/billing/state`, { headers: { cookie } });
    const stateBody = (await state.json()) as { planSlug: string | null; status: string };
    check("billing state reports no plan", stateBody.planSlug === null && stateBody.status === "none", JSON.stringify(stateBody));
  }

  console.log(`\n${failures === 0 ? "PASS" : "FAIL"}: ${failures} failing assertion(s)`);
  if (failures > 0) process.exit(1);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
