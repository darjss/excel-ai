import { useMutation, useQuery } from "@tanstack/solid-query";
import { For, Match, Show, Switch } from "solid-js";
import { toast } from "solid-sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, queryErrorMessage, unwrap } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { deriveBillingView, toBillingStatus } from "@/lib/billing";
import { plans } from "@/lib/plans";

const useBillingState = () =>
  useQuery(() => ({
    queryKey: ["billing", "state"],
    queryFn: async () => unwrap(await api.billing.state.get()),
  }));

export const BillingPage = () => {
  const state = useBillingState();

  const checkout = useMutation(() => ({
    mutationFn: async (planSlug: string) => unwrap(await api.billing.checkout.post({ planSlug })),
    onSuccess: (result) => window.location.assign(result.url),
    onError: (error) => toast.error(queryErrorMessage(error)),
  }));

  const openPortal = async () => {
    const result = await authClient.customer.portal();
    if (result.error) toast.error(result.error.message ?? "Could not open portal");
  };

  return (
    <div class="mx-auto max-w-2xl">
      <h1 class="text-2xl font-bold">Billing</h1>
      <Switch>
        <Match when={state.isPending}>
          <p class="text-muted-foreground mt-6 text-sm">Loading…</p>
        </Match>
        <Match when={state.isError}>
          <p class="text-destructive mt-6 text-sm">{queryErrorMessage(state.error)}</p>
        </Match>
        <Match when={state.data}>
          {(billing) => {
            const view = () =>
              deriveBillingView({
                planSlug: billing().planSlug,
                status: toBillingStatus(billing().status),
                currentPeriodEnd: billing().currentPeriodEnd,
              });
            return (
              <Card class="mt-6">
                <CardHeader>
                  <CardTitle>Current plan: {view().planName}</CardTitle>
                  <p class="text-muted-foreground text-sm">Status: {view().statusLabel}</p>
                  <Show when={view().periodEndLabel}>
                    {(label) => (
                      <p class="text-muted-foreground text-sm">Renews {label()}</p>
                    )}
                  </Show>
                </CardHeader>
                <CardContent class="flex flex-col gap-3">
                  <Show
                    when={view().isActive}
                    fallback={
                      <div class="flex flex-col gap-2">
                        <p class="text-muted-foreground text-sm">
                          Choose a plan to publish your portal.
                        </p>
                        <div class="flex gap-2">
                          <For each={plans}>
                            {(plan) => (
                              <Button
                                variant={plan.highlighted ? "default" : "outline"}
                                disabled={checkout.isPending}
                                onClick={() => checkout.mutate(plan.slug)}
                              >
                                {plan.name} · ${plan.priceMonthly}/mo
                              </Button>
                            )}
                          </For>
                        </div>
                      </div>
                    }
                  >
                    <div class="flex gap-2">
                      <Show when={view().canUpgrade}>
                        <Button
                          disabled={checkout.isPending}
                          onClick={() => checkout.mutate("pro")}
                        >
                          Upgrade to Pro
                        </Button>
                      </Show>
                      <Button variant="outline" onClick={openPortal}>
                        Manage subscription & invoices
                      </Button>
                    </div>
                  </Show>
                </CardContent>
              </Card>
            );
          }}
        </Match>
      </Switch>
    </div>
  );
};
