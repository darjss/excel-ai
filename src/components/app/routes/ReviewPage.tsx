import { useParams } from "@solidjs/router";
import { Show, createSignal, onMount } from "solid-js";
import { toast } from "solid-sonner";
import { FindingsPane } from "@/components/review/FindingsPane";
import { PortalPreviewFrame } from "@/components/review/PortalPreviewFrame";
import { PublishPanel } from "@/components/review/PublishPanel";
import { queryErrorMessage } from "@/lib/api";
import { useClaimDraft, useDraft, useFindingDecision } from "@/lib/queries/review";

export const ReviewPage = () => {
  const params = useParams();
  const jobId = () => params.jobId ?? "";
  const [claimed, setClaimed] = createSignal(false);
  const [claimError, setClaimError] = createSignal<string | null>(null);
  const claim = useClaimDraft();
  const draft = useDraft(jobId, claimed);
  const decide = useFindingDecision(jobId);

  onMount(() => {
    claim.mutate(jobId(), {
      onSuccess: () => setClaimed(true),
      onError: (error) => setClaimError(queryErrorMessage(error)),
    });
  });

  const onDecide = (findingId: string, accepted: boolean): void => {
    decide.mutate({ findingId, accepted }, { onError: (error) => toast.error(queryErrorMessage(error)) });
  };

  return (
    <div class="mx-auto max-w-6xl">
      <Show
        when={!claimError()}
        fallback={
          <div class="bg-card rounded-xl border p-6">
            <h1 class="mb-2 text-xl font-semibold">Can not open this draft</h1>
            <p class="text-destructive text-sm">{claimError()}</p>
          </div>
        }
      >
        <Show
          when={draft.data}
          fallback={<p class="text-muted-foreground p-6">Loading your draft…</p>}
        >
          {(data) => (
            <div class="grid gap-6 lg:grid-cols-2">
              <div class="flex flex-col gap-6">
                <div>
                  <h1 class="text-2xl font-bold tracking-tight">Review your portal</h1>
                  <p class="text-muted-foreground text-sm">
                    {data().summary.confirmed} confirmed · {data().summary.questions} to review
                  </p>
                </div>
                <FindingsPane
                  findings={data().findings}
                  pending={decide.isPending}
                  onDecide={onDecide}
                />
                <PublishPanel jobId={jobId()} businessName={data().config.business.name} />
              </div>
              <div class="lg:sticky lg:top-6 lg:self-start">
                <PortalPreviewFrame config={data().config} />
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
};
