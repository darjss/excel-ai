import ExternalLink from "lucide-solid/icons/external-link";
import { Show, createResource, createSignal } from "solid-js";
import { toast } from "solid-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryErrorMessage } from "@/lib/api";
import { fetchSlugAvailability, usePublishPortal } from "@/lib/queries/review";
import { isValidSlug, suggestSlug } from "@/review/slug";

export interface PublishPanelProps {
  jobId: string;
  businessName: string;
}

export const PublishPanel = (props: PublishPanelProps) => {
  const [slug, setSlug] = createSignal(suggestSlug(props.businessName));
  const [published, setPublished] = createSignal<{ slug: string; portalUrl: string } | null>(null);
  const publish = usePublishPortal(() => props.jobId);

  const [availability] = createResource(
    () => (isValidSlug(slug()) ? slug() : null),
    (value) => fetchSlugAvailability(value),
  );

  const ready = () =>
    isValidSlug(slug()) && availability()?.available === true && !publish.isPending;

  const onPublish = (): void => {
    publish.mutate(slug(), {
      onSuccess: (result) => setPublished(result),
      onError: (error) => toast.error(queryErrorMessage(error)),
    });
  };

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
