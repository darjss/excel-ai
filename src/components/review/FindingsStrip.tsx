import type { Finding } from "@/portal-config";
import { summarizeFindings } from "@/review/summary";

export const FindingsStrip = (props: { findings: readonly Finding[] }) => {
  const summary = () => summarizeFindings(props.findings);
  return (
    <div class="bg-card flex items-center gap-3 rounded-lg border px-4 py-3 text-sm">
      <span class="font-medium text-emerald-600">{summary().confirmed} confirmed</span>
      <span class="text-muted-foreground">·</span>
      <span class="font-medium text-amber-600">
        {summary().questions} {summary().questions === 1 ? "question" : "questions"} to review
      </span>
    </div>
  );
};
