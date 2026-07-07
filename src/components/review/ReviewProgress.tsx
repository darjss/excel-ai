import type { ExtractionSnapshot } from "@/lib/extraction-stream";

export const ReviewProgress = (props: { snapshot: ExtractionSnapshot }) => {
  const latest = () => props.snapshot.events.at(-1)?.message ?? "Getting your workbook ready…";
  return (
    <div class="mx-auto max-w-xl py-24 text-center">
      <h1 class="text-2xl font-semibold tracking-tight">Reading your spreadsheet</h1>
      <p class="text-muted-foreground mt-3">{latest()}</p>
      <div class="bg-muted mt-8 h-2 w-full overflow-hidden rounded-full">
        <div
          class="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${props.snapshot.percent}%` }}
        />
      </div>
    </div>
  );
};
