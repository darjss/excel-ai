import { createMemo, createSignal, For, Show } from "solid-js";
import type { SheetPreview } from "@/extraction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Role = "product" | "price" | "unit" | "category";

const ROLES: { key: Role; label: string; required: boolean }[] = [
  { key: "product", label: "Product name", required: true },
  { key: "price", label: "Unit price", required: true },
  { key: "unit", label: "Unit of sale", required: false },
  { key: "category", label: "Category", required: false },
];

const selectClass =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

export const BuilderMode = (props: {
  jobId: string;
  message: string;
  preview: SheetPreview[];
}) => {
  const [sheet, setSheet] = createSignal(props.preview[0]?.sheet ?? "");
  const [range, setRange] = createSignal("");
  const [columns, setColumns] = createSignal<Record<Role, string>>({
    product: "",
    price: "",
    unit: "",
    category: "",
  });
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const active = createMemo(
    () => props.preview.find((entry) => entry.sheet === sheet()) ?? props.preview[0],
  );

  const setRole = (role: Role, value: string): void => {
    setColumns({ ...columns(), [role]: value });
  };

  const ready = createMemo(
    () => range().trim().length > 0 && columns().product !== "" && columns().price !== "",
  );

  const onSubmit = async (): Promise<void> => {
    if (!ready()) return;
    setPending(true);
    setError(null);
    const picked = columns();
    const chosen: Record<string, string> = {};
    for (const role of ROLES) {
      const value = picked[role.key];
      if (value !== "") chosen[role.key] = value;
    }
    try {
      const response = await fetch(`/api/extraction/${props.jobId}/refine`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sheet: sheet(), range: range().trim(), columns: chosen }),
      });
      if (!response.ok) {
        setError("We couldn't rebuild from that selection. Check the range and try again.");
        return;
      }
      window.location.reload();
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="mx-auto max-w-4xl py-16">
      <h1 class="text-3xl font-semibold tracking-tight">Point us at your product table</h1>
      <p class="text-muted-foreground mt-4 text-lg">{props.message}</p>

      <Show when={props.preview.length > 1}>
        <label class="mt-8 block">
          <span class="text-sm font-medium">Sheet</span>
          <select
            class={`${selectClass} mt-1`}
            value={sheet()}
            onChange={(event) => setSheet(event.currentTarget.value)}
          >
            <For each={props.preview}>
              {(entry) => <option value={entry.sheet}>{entry.sheet}</option>}
            </For>
          </select>
        </label>
      </Show>

      <div class="border-border mt-6 overflow-x-auto rounded-xl border">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-muted">
              <For each={active()?.columns ?? []}>
                {(letter) => <th class="border-border border px-2 py-1 font-medium">{letter}</th>}
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={active()?.rows ?? []}>
              {(row) => (
                <tr>
                  <For each={row}>
                    {(cell) => (
                      <td class="border-border text-muted-foreground border px-2 py-1">{cell}</td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <label class="block sm:col-span-2">
          <span class="text-sm font-medium">Table range (e.g. B4:F40)</span>
          <Input
            class="mt-1"
            value={range()}
            onInput={(event) => setRange(event.currentTarget.value)}
            placeholder="B4:F40"
          />
        </label>
        <For each={ROLES}>
          {(role) => (
            <label class="block">
              <span class="text-sm font-medium">
                {role.label}
                {role.required ? "" : " (optional)"}
              </span>
              <select
                class={`${selectClass} mt-1`}
                value={columns()[role.key]}
                onChange={(event) => setRole(role.key, event.currentTarget.value)}
              >
                <option value="">—</option>
                <For each={active()?.columns ?? []}>
                  {(letter) => <option value={letter}>{letter}</option>}
                </For>
              </select>
            </label>
          )}
        </For>
      </div>

      <Show when={error()}>
        {(message) => <p class="text-destructive mt-4 text-sm">{message()}</p>}
      </Show>

      <Button class="mt-8" disabled={!ready() || pending()} onClick={() => void onSubmit()}>
        {pending() ? "Rebuilding…" : "Rebuild my portal"}
      </Button>
    </div>
  );
};
