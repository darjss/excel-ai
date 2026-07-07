import UploadCloud from "lucide-solid/icons/upload-cloud";
import { Show, createSignal } from "solid-js";
import { ExtractionFeed } from "@/components/review/ExtractionFeed";
import { Button } from "@/components/ui/button";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const validate = (file: File): string | null => {
  if (!file.name.toLowerCase().endsWith(".xlsx")) return "Upload a .xlsx spreadsheet.";
  if (file.size > MAX_UPLOAD_BYTES) return "That file is over the 10MB limit.";
  return null;
};

export const Hero = () => {
  const [jobId, setJobId] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [dragging, setDragging] = createSignal(false);
  const [uploading, setUploading] = createSignal(false);

  const upload = async (file: File): Promise<void> => {
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch("/api/extraction", { method: "POST", body: form });
      const payload = (await response.json()) as { jobId?: string; error?: { message: string } };
      if (!response.ok || !payload.jobId) {
        setError(payload.error?.message ?? "Upload failed. Please try again.");
        return;
      }
      setJobId(payload.jobId);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: DragEvent): void => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer?.files[0];
    if (file) void upload(file);
  };

  return (
    <section class="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center">
      <h1 class="text-4xl font-bold tracking-tight md:text-6xl">
        Your spreadsheet, a live order portal
      </h1>
      <p class="text-muted-foreground max-w-xl text-lg">
        Drop your price-list spreadsheet and watch us turn it into a customer-facing portal. No
        account needed to preview.
      </p>

      <Show
        when={jobId()}
        fallback={
          <div class="flex w-full max-w-xl flex-col gap-3">
            <label
              class="border-input hover:bg-accent/40 flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-colors"
              classList={{ "border-primary bg-accent/40": dragging() }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <UploadCloud class="text-muted-foreground size-8" />
              <span class="font-medium">
                {uploading() ? "Uploading…" : "Drop your .xlsx here, or click to browse"}
              </span>
              <span class="text-muted-foreground text-sm">Up to 10MB</span>
              <input
                type="file"
                accept=".xlsx"
                class="hidden"
                disabled={uploading()}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void upload(file);
                }}
              />
            </label>
            <Show when={error()}>
              <p class="text-destructive text-sm">{error()}</p>
            </Show>
          </div>
        }
      >
        {(id) => (
          <div class="bg-card w-full max-w-xl rounded-xl border p-6">
            <ExtractionFeed
              jobId={id()}
              onDone={() => window.location.assign(`/review/${id()}`)}
              onError={setError}
            />
            <Show when={error()}>
              <Button class="mt-4" variant="outline" onClick={() => setJobId(null)}>
                Try another file
              </Button>
            </Show>
          </div>
        )}
      </Show>
    </section>
  );
};
