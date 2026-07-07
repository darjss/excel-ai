import { type JSX, Match, Switch } from "solid-js";
import { createExtractionStream, type ReviewOutcome } from "@/lib/extraction-stream";
import { BuilderMode } from "./BuilderMode";
import { NeedsHuman } from "./NeedsHuman";
import { ReviewPreview } from "./ReviewPreview";
import { ReviewProgress } from "./ReviewProgress";
import { WrongSpecies } from "./WrongSpecies";

const assertUnreachable = (value: never): never => {
  throw new Error(`Unhandled extraction outcome: ${JSON.stringify(value)}`);
};

const renderOutcome = (outcome: ReviewOutcome, jobId: string): JSX.Element => {
  switch (outcome.kind) {
    case "ready":
      return <ReviewPreview jobId={jobId} />;
    case "wrong-species":
      return <WrongSpecies message={outcome.message} />;
    case "builder-mode":
      return <BuilderMode jobId={jobId} message={outcome.message} preview={outcome.preview} />;
    case "needs-human":
      return <NeedsHuman jobId={jobId} reason={outcome.reason} message={outcome.message} />;
    default:
      return assertUnreachable(outcome);
  }
};

export const ReviewLadder = (props: { jobId: string }) => {
  const snapshot = createExtractionStream(() => props.jobId);

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
        <Match when={snapshot().outcome}>{(outcome) => renderOutcome(outcome(), props.jobId)}</Match>
      </Switch>
    </main>
  );
};
