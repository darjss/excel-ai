import { type Accessor, createMemo, from } from "solid-js";
import type { PortalConfig } from "@/portal-config";
import type { ExtractionPhase, ProgressEvent, SheetPreview } from "@/extraction";

export type ReviewOutcome =
  | { kind: "ready"; config: PortalConfig }
  | { kind: "wrong-species"; message: string }
  | { kind: "builder-mode"; message: string; preview: SheetPreview[] }
  | { kind: "needs-human"; reason: string; message: string };

export interface ExtractionSnapshot {
  status: "connecting" | "streaming" | "resolved" | "error";
  events: ProgressEvent[];
  phase: ExtractionPhase;
  percent: number;
  outcome: ReviewOutcome | null;
  error: string | null;
}

interface ExternalStore<T> {
  getSnapshot: () => T;
  subscribe: (onChange: () => void) => () => void;
}

const initialSnapshot = (): ExtractionSnapshot => ({
  status: "connecting",
  events: [],
  phase: "queued",
  percent: 0,
  outcome: null,
  error: null,
});

export const createExtractionStore = (jobId: string): ExternalStore<ExtractionSnapshot> => {
  let snapshot = initialSnapshot();
  const listeners = new Set<() => void>();
  const emit = (): void => listeners.forEach((listener) => listener());
  const set = (patch: Partial<ExtractionSnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    emit();
  };

  const source = new EventSource(`/api/extraction/${jobId}/events`);
  const resolve = (outcome: ReviewOutcome): void => {
    set({ status: "resolved", phase: "done", percent: 100, outcome });
    source.close();
  };

  source.addEventListener("open", () => set({ status: "streaming" }));
  source.addEventListener("progress", (event: MessageEvent<string>) => {
    const progressEvent = JSON.parse(event.data) as ProgressEvent;
    set({
      status: "streaming",
      events: [...snapshot.events, progressEvent],
      phase: progressEvent.phase,
      percent: progressEvent.percent,
    });
  });
  source.addEventListener("result", (event: MessageEvent<string>) => {
    const { config } = JSON.parse(event.data) as { config: PortalConfig };
    resolve({ kind: "ready", config });
  });
  source.addEventListener("wrong_species", (event: MessageEvent<string>) => {
    const { message } = JSON.parse(event.data) as { message: string };
    resolve({ kind: "wrong-species", message });
  });
  source.addEventListener("builder_mode", (event: MessageEvent<string>) => {
    const { message, preview } = JSON.parse(event.data) as {
      message: string;
      preview: SheetPreview[];
    };
    resolve({ kind: "builder-mode", message, preview });
  });
  source.addEventListener("needs_human", (event: MessageEvent<string>) => {
    const { reason, message } = JSON.parse(event.data) as { reason: string; message: string };
    resolve({ kind: "needs-human", reason, message });
  });
  source.addEventListener("not_found", (event: MessageEvent<string>) => {
    const { message } = JSON.parse(event.data) as { message: string };
    set({ status: "error", phase: "error", error: message });
    source.close();
  });

  return {
    getSnapshot: () => snapshot,
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) source.close();
      };
    },
  };
};

export const createExtractionStream = (jobId: Accessor<string>): Accessor<ExtractionSnapshot> => {
  const signal = createMemo(() => {
    const store = createExtractionStore(jobId());
    return from<ExtractionSnapshot>((set) => {
      const unsubscribe = store.subscribe(() => set(store.getSnapshot()));
      set(store.getSnapshot());
      return unsubscribe;
    });
  });
  return () => signal()() ?? initialSnapshot();
};
