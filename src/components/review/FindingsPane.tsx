import Check from "lucide-solid/icons/check";
import RotateCcw from "lucide-solid/icons/rotate-ccw";
import { For, Show } from "solid-js";
import type { Finding } from "@/portal-config";
import { Button } from "@/components/ui/button";
import { type FindingGroupKind, groupFindingList } from "@/review/summary";

const GROUP_LABEL: Record<FindingGroupKind, string> = {
  rule: "Pricing rules",
  product: "Products",
  category: "Categories",
  general: "Overview",
};

interface FindingRowProps {
  finding: Finding;
  pending: boolean;
  onDecide: (findingId: string, accepted: boolean) => void;
}

const FindingRow = (props: FindingRowProps) => (
  <div class="bg-card flex flex-col gap-2 rounded-lg border p-3">
    <p class="text-sm">{props.finding.plainEnglish}</p>
    <Show when={props.finding.question && !props.finding.accepted}>
      <p class="text-muted-foreground text-sm italic">{props.finding.question}</p>
    </Show>
    <div class="flex items-center gap-2">
      <Show
        when={props.finding.accepted}
        fallback={
          <>
            <Button
              size="sm"
              disabled={props.pending}
              onClick={() => props.onDecide(props.finding.id, true)}
            >
              <Check class="size-4" />
              Confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={props.pending}
              onClick={() => props.onDecide(props.finding.id, false)}
            >
              Not this
            </Button>
          </>
        }
      >
        <span class="flex items-center gap-1 text-sm font-medium text-emerald-600">
          <Check class="size-4" />
          Confirmed
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={props.pending}
          onClick={() => props.onDecide(props.finding.id, false)}
        >
          <RotateCcw class="size-4" />
          Undo
        </Button>
      </Show>
    </div>
  </div>
);

export interface FindingsPaneProps {
  findings: readonly Finding[];
  pending: boolean;
  onDecide: (findingId: string, accepted: boolean) => void;
}

export const FindingsPane = (props: FindingsPaneProps) => (
  <div class="flex flex-col gap-6">
    <For each={groupFindingList(props.findings)}>
      {(group) => (
        <section class="flex flex-col gap-3">
          <h3 class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            {GROUP_LABEL[group.kind]}
          </h3>
          <For each={group.findings}>
            {(finding) => (
              <FindingRow finding={finding} pending={props.pending} onDecide={props.onDecide} />
            )}
          </For>
        </section>
      )}
    </For>
  </div>
);
