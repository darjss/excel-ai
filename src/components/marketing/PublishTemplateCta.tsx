import ArrowRight from "lucide-solid/icons/arrow-right";
import Loader from "lucide-solid/icons/loader-circle";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { createExtractionStream } from "@/lib/extraction-stream";
import type { PortalConfig } from "@/portal-config";

export interface PublishTemplateCtaProps {
  slug: string;
  niche: string;
}

interface StartResponse {
  jobId: string;
}

interface ErrorResponse {
  error: { code: string; message: string };
}

const isStartResponse = (value: unknown): value is StartResponse =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Record<string, unknown>).jobId === "string";

const errorMessage = (value: unknown): string | null => {
  if (typeof value !== "object" || value === null) return null;
  const error = (value as ErrorResponse).error;
  if (typeof error !== "object" || error === null) return null;
  return typeof error.message === "string" ? error.message : null;
};

const formatPrice = (amount: number, currencyCode: string): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(
    amount / 100,
  );

const previewProducts = (config: PortalConfig) =>
  config.catalog.tables.flatMap((table) => table.products);

const PreviewCard = (props: { jobId: string; slug: string }) => {
  const snapshot = createExtractionStream(() => props.jobId);
  const events = createMemo(() => snapshot().events);
  const config = createMemo(() => {
    const outcome = snapshot().outcome;
    return outcome?.kind === "ready" ? outcome.config : null;
  });

  return (
    <div class="rounded-xl border p-6">
      <Show
        when={snapshot().status !== "error"}
        fallback={
          <div>
            <p class="font-medium">That didn't work this time.</p>
            <p class="text-muted-foreground mt-1 text-sm">{snapshot().error}</p>
            <p class="text-muted-foreground mt-3 text-sm">
              Browse the{" "}
              <a href="/templates" class="text-primary underline underline-offset-4">
                template gallery
              </a>{" "}
              or drop your own sheet on the home page.
            </p>
          </div>
        }
      >
        <div class="flex items-center gap-2">
          <Show when={snapshot().status !== "resolved"}>
            <Loader class="text-muted-foreground size-4 animate-spin" />
          </Show>
          <p class="text-sm font-medium">
            {snapshot().status === "resolved"
              ? "Portal preview ready"
              : "Building your portal preview"}
          </p>
        </div>

        <ul class="mt-4 space-y-1">
          <For each={events()}>
            {(event) => <li class="text-muted-foreground text-sm">{event.message}</li>}
          </For>
        </ul>

        <Show when={config()}>
          {(portalConfig) => (
            <div class="mt-6">
              <div class="mb-2 flex items-center justify-between">
                <p class="font-semibold">{portalConfig().business.name}</p>
                <span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
                  Watermarked preview
                </span>
              </div>
              <div class="divide-y rounded-lg border">
                <For each={previewProducts(portalConfig()).slice(0, 6)}>
                  {(product) => (
                    <div class="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{product.name}</span>
                      <span class="text-muted-foreground tabular-nums">
                        {formatPrice(product.unitPrice.amount, product.unitPrice.currencyCode)}
                      </span>
                    </div>
                  )}
                </For>
              </div>
              <div class="mt-6 flex flex-wrap items-center gap-3">
                <Button as="a" href="/login">
                  Create account to publish
                  <ArrowRight class="size-4" />
                </Button>
                <a
                  href={`/app?template=${props.slug}`}
                  class="text-muted-foreground hover:text-foreground text-sm"
                >
                  Open in the full app
                </a>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};

export const PublishTemplateCta = (props: PublishTemplateCtaProps) => {
  const [jobId, setJobId] = createSignal<string | null>(null);
  const [starting, setStarting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const start = async (): Promise<void> => {
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/extraction/from-template", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: props.slug }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        setError(errorMessage(payload) ?? "Could not start the preview. Try again shortly.");
        return;
      }
      if (!isStartResponse(payload)) {
        setError("Unexpected response from the server.");
        return;
      }
      setJobId(payload.jobId);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div>
      <Show
        when={jobId()}
        fallback={
          <div class="rounded-xl border border-dashed p-6">
            <p class="font-semibold">Or make this a live order portal in 5 minutes</p>
            <p class="text-muted-foreground mt-1 text-sm">
              Sheetstand reads this exact sheet and turns it into a hosted{" "}
              {props.niche.toLowerCase()} order portal your buyers order from — no signup to see the
              preview.
            </p>
            <div class="mt-4">
              <Button onClick={() => void start()} disabled={starting()} size="lg">
                <Show when={starting()} fallback={<>Make this a live order portal</>}>
                  Starting…
                </Show>
                <ArrowRight class="size-4" />
              </Button>
            </div>
            <Show when={error()}>
              {(message) => <p class="mt-3 text-sm text-red-600">{message()}</p>}
            </Show>
          </div>
        }
      >
        {(id) => <PreviewCard jobId={id()} slug={props.slug} />}
      </Show>
    </div>
  );
};
