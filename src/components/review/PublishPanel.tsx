import { useMutation } from "@tanstack/solid-query";
import ExternalLink from "lucide-solid/icons/external-link";
import { For, Show, createResource, createSignal, onMount } from "solid-js";
import { toast } from "solid-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, api, queryErrorMessage, unwrap } from "@/lib/api";
import { plans } from "@/lib/plans";
import { fetchSlugAvailability, usePublishPortal } from "@/lib/queries/review";
import { isValidSlug, suggestSlug } from "@/review/slug";

export interface PublishPanelProps {
  jobId: string;
  businessName: string;
  openQuestions: number;
}

export const PublishPanel = (props: PublishPanelProps) => {
  const [slug, setSlug] = createSignal(suggestSlug(props.businessName));
  const [published, setPublished] = createSignal<{ slug: string; portalUrl: string } | null>(null);
  const [paywalled, setPaywalled] = createSignal(false);
  const publish = usePublishPortal(() => props.jobId);

  const checkout = useMutation(() => ({
    mutationFn: async (planSlug: string) => {
      const successPath = `${window.location.pathname}?checkout=success&slug=${encodeURIComponent(slug())}`;
      return unwrap(await api.billing.checkout.post({ planSlug, successPath }));
    },
    onSuccess: (result) => window.location.assign(result.url),
    onError: (error) => toast.error(queryErrorMessage(error)),
  }));

  const [availability] = createResource(
    () => (isValidSlug(slug()) ? slug() : null),
    (value) => fetchSlugAvailability(value),
  );

  const ready = () =>
    props.openQuestions === 0 &&
    isValidSlug(slug()) &&
    availability()?.available === true &&
    !publish.isPending;

  const onPublish = (): void => {
    setPaywalled(false);
    publish.mutate(slug(), {
      onSuccess: (result) => setPublished(result),
      onError: (error) => {
        if (error instanceof ApiError && error.status === 402) {
          setPaywalled(true);
          return;
        }
        toast.error(queryErrorMessage(error));
      },
    });
  };

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    const returned = params.get("slug");
    if (returned) setSlug(returned);
    if (props.openQuestions === 0) onPublish();
  });

  return (
    <div class="bg-card flex flex-col gap-3 rounded-xl border p-4">
      <Show
        when={published()}
        fallback={
          <>
            <div>
              <h3 class="font-semibold">Publish your portal</h3>
              <p class="text-muted-foreground text-sm">Pick the subdomain buyers will visit.</p>
            </div>
            <div class="flex items-center gap-2">
              <Input
                value={slug()}
                onInput={(event) => setSlug(event.currentTarget.value.toLowerCase())}
                placeholder="your-business"
                class="flex-1"
              />
              <span class="text-muted-foreground text-sm">.sheetstand.com</span>
            </div>
            <Show when={slug().length > 0}>
              <Show
                when={isValidSlug(slug())}
                fallback={<p class="text-destructive text-sm">Not a valid subdomain</p>}
              >
                <Show when={!availability.loading}>
                  <p
                    class="text-sm"
                    classList={{
                      "text-emerald-600": availability()?.available === true,
                      "text-destructive": availability()?.available === false,
                    }}
                  >
                    {availability()?.available === true ? "Available" : "Already taken"}
                  </p>
                </Show>
              </Show>
            </Show>
            <Button disabled={!ready()} onClick={onPublish}>
              {publish.isPending ? "Publishing…" : "Publish to go live"}
            </Button>
            <Show when={props.openQuestions > 0}>
              <p class="text-amber-600 text-sm">
                {props.openQuestions}{" "}
                {props.openQuestions === 1 ? "question unanswered" : "questions unanswered"}
              </p>
            </Show>
            <Show when={paywalled()}>
              <div class="flex flex-col gap-3 border-t pt-3">
                <div>
                  <h4 class="font-semibold">Choose a plan to publish</h4>
                  <p class="text-muted-foreground text-sm">
                    Extraction and preview are free. Publishing your portal needs a paid plan.
                  </p>
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                  <For each={plans}>
                    {(plan) => (
                      <div class="flex flex-col gap-2 rounded-lg border p-3">
                        <div>
                          <p class="font-medium">{plan.name}</p>
                          <p class="text-muted-foreground text-sm">${plan.priceMonthly}/mo</p>
                        </div>
                        <Button
                          variant={plan.highlighted ? "default" : "outline"}
                          disabled={checkout.isPending}
                          onClick={() => checkout.mutate(plan.slug)}
                        >
                          {checkout.isPending ? "Redirecting…" : `Choose ${plan.name}`}
                        </Button>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </>
        }
      >
        {(result) => (
          <>
            <h3 class="font-semibold text-emerald-600">Your portal is live</h3>
            <a
              href={result().portalUrl}
              class="text-primary inline-flex items-center gap-1 font-medium hover:underline"
            >
              {result().portalUrl}
              <ExternalLink class="size-4" />
            </a>
            <a href="/app" class="text-muted-foreground text-sm hover:underline">
              Go to your dashboard
            </a>
          </>
        )}
      </Show>
    </div>
  );
};
