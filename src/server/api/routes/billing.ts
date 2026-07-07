import { Elysia, t } from "elysia";
import { env } from "@/env";
import { paymentProvider } from "@/server/billing";
import { getSubscription } from "@/server/billing/subscription";
import { authPlugin } from "../plugins/auth";

const DEFAULT_SUCCESS_PATH = "/app/billing?checkout=success";

const safeSuccessUrl = (successPath: string | undefined): string => {
  const path =
    successPath && successPath.startsWith("/") && !successPath.startsWith("//")
      ? successPath
      : DEFAULT_SUCCESS_PATH;
  return `${env.APP_URL}${path}`;
};

export const billingRoute = new Elysia({ prefix: "/billing" })
  .use(authPlugin)
  .get(
    "/state",
    async ({ user }) => {
      const subscription = await getSubscription(user.id);
      return {
        planSlug: subscription?.planSlug ?? null,
        status: subscription?.status ?? "none",
        currentPeriodEnd: subscription?.currentPeriodEnd?.getTime() ?? null,
      };
    },
    { requireAuth: true },
  )
  .post(
    "/checkout",
    ({ user, body }) =>
      paymentProvider.createCheckout({
        userId: user.id,
        planSlug: body.planSlug,
        successUrl: safeSuccessUrl(body.successPath),
      }),
    {
      requireAuth: true,
      body: t.Object({
        planSlug: t.String({ minLength: 1 }),
        successPath: t.Optional(t.String()),
      }),
    },
  );
