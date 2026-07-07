import { type Accessor, createMemo, from } from "solid-js";
import type { PortalConfig } from "@/portal-config";
import type { ExtractionPhase, ProgressEvent } from "@/extraction";

export interface ExtractionSnapshot {
  status: "connecting" | "streaming" | "done" | "error";
  events: ProgressEvent[];
  phase: ExtractionPhase;
  percent: number;
  config: PortalConfig | null;
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
  config: null,
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
    set({ status: "done", phase: "done", percent: 100, config });
    source.close();
  });
  source.addEventListener("failed", (event: MessageEvent<string>) => {
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
