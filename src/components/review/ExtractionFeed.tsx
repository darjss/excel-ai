import { type Accessor, For, Show, createEffect } from "solid-js";
import type { PortalConfig } from "@/portal-config";
import { type ExtractionSnapshot, createExtractionStream } from "@/lib/extraction-stream";

export const ExtractionFeedView = (props: { snapshot: Accessor<ExtractionSnapshot> }) => (
  <div class="flex w-full flex-col gap-4">
    <div class="bg-muted h-2 w-full overflow-hidden rounded-full">
      <div
        class="bg-primary h-full rounded-full transition-all duration-500"
        style={{ width: `${props.snapshot().percent}%` }}
      />
    </div>
    <ul class="flex flex-col gap-1 text-left text-sm">
      <For each={props.snapshot().events}>
        {(event) => (
          <li class="text-muted-foreground flex items-center gap-2">
            <span class="bg-primary/60 inline-block size-1.5 rounded-full" />
            {event.message}
          </li>
        )}
      </For>
    </ul>
    <Show when={props.snapshot().status === "error"}>
      <p class="text-destructive text-sm">{props.snapshot().error}</p>
    </Show>
  </div>
);

export interface ExtractionFeedProps {
  jobId: string;
  onDone?: (config: PortalConfig) => void;
  onError?: (message: string) => void;
}

export const ExtractionFeed = (props: ExtractionFeedProps) => {
  const snapshot = createExtractionStream(() => props.jobId);

  createEffect(() => {
    const current = snapshot();
    if (current.status === "done" && current.config) props.onDone?.(current.config);
    if (current.status === "error" && current.error) props.onError?.(current.error);
  });

  return <ExtractionFeedView snapshot={snapshot} />;
};
