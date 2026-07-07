import { Match, Switch } from "solid-js";
import { createExtractionStream } from "@/lib/extraction-stream";
import type { ReviewOutcome } from "@/lib/extraction-stream";
import { BuilderMode } from "./BuilderMode";
import { NeedsHuman } from "./NeedsHuman";
import { ReviewProgress } from "./ReviewProgress";
import { WrongSpecies } from "./WrongSpecies";

const asReady = (outcome: ReviewOutcome | null) => (outcome?.kind === "ready" ? outcome : null);
const asWrong = (outcome: ReviewOutcome | null) =>
  outcome?.kind === "wrong-species" ? outcome : null;
const asBuilder = (outcome: ReviewOutcome | null) =>
  outcome?.kind === "builder-mode" ? outcome : null;
const asHuman = (outcome: ReviewOutcome | null) =>
  outcome?.kind === "needs-human" ? outcome : null;

const ReadyDraft = (props: { businessName: string }) => (
  <div class="mx-auto max-w-xl py-24 text-center">
    <h1 class="text-3xl font-semibold tracking-tight">Your portal draft is ready</h1>
    <p class="text-muted-foreground mt-4 text-lg">
      We built a draft portal for {props.businessName}. The Review Screen picks up from here.
    </p>
  </div>
);

export const ReviewLadder = (props: { jobId: string }) => {
  const snapshot = createExtractionStream(() => props.jobId);
  const outcome = () => snapshot().outcome;

  const ready = () => asReady(outcome());
  const wrong = () => asWrong(outcome());
  const builder = () => asBuilder(outcome());
  const human = () => asHuman(outcome());

  return (
    <main class="px-6">
      <Switch fallback={<ReviewProgress snapshot={snapshot()} />}>
        <Match when={snapshot().status === "error"}>
          <NeedsHuman
            jobId={props.jobId}
            reason="internal"
            message={snapshot().error ?? "We lost track of this job. Send your file to us and we'll take a look."}
          />
        </Match>
        <Match when={ready()}>{(value) => <ReadyDraft businessName={value().config.business.name} />}</Match>
        <Match when={wrong()}>{(value) => <WrongSpecies message={value().message} />}</Match>
        <Match when={builder()}>
          {(value) => (
            <BuilderMode jobId={props.jobId} message={value().message} preview={value().preview} />
          )}
        </Match>
        <Match when={human()}>
          {(value) => (
            <NeedsHuman jobId={props.jobId} reason={value().reason} message={value().message} />
          )}
        </Match>
      </Switch>
    </main>
  );
};
