import { Show } from "solid-js";
import { createExtractionStream } from "@/lib/extraction-stream";
import { ExtractionFeedView } from "./ExtractionFeed";
import { FindingsStrip } from "./FindingsStrip";
import { PortalPreviewFrame } from "./PortalPreviewFrame";

export const ReviewPreview = (props: { jobId: string }) => {
  const snapshot = createExtractionStream(() => props.jobId);
  const readyConfig = () => {
    const outcome = snapshot().outcome;
    return outcome?.kind === "ready" ? outcome.config : null;
  };

  return (
    <div class="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <Show
        when={readyConfig()}
        fallback={
          <div class="bg-card rounded-xl border p-6">
            <h1 class="mb-4 text-2xl font-semibold">Reading your spreadsheet…</h1>
            <ExtractionFeedView snapshot={snapshot} />
          </div>
        }
      >
        {(config) => (
          <>
            <div class="text-center">
              <h1 class="text-3xl font-bold tracking-tight">Here is your portal preview</h1>
              <p class="text-muted-foreground mt-2">
                Sign in to review what we found and publish it to your own subdomain.
              </p>
            </div>
            <FindingsStrip findings={config().findings} />
            <PortalPreviewFrame config={config()} watermark />
            <a
              href={`/app/review/${props.jobId}`}
              class="bg-primary text-primary-foreground hover:bg-primary/90 mx-auto inline-flex h-12 items-center justify-center rounded-md px-8 font-medium"
            >
              Review &amp; publish
            </a>
          </>
        )}
      </Show>
    </div>
  );
};
