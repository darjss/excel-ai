import { createSignal, Show } from "solid-js";
import * as v from "valibot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createForm } from "@/lib/form";

const emailForm = v.object({
  email: v.pipe(v.string(), v.trim(), v.email("Enter a valid email so we can reach you.")),
});

export const NeedsHuman = (props: { jobId: string; reason: string; message: string }) => {
  const form = createForm(emailForm);
  const [submitted, setSubmitted] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [serverError, setServerError] = createSignal<string | null>(null);

  const onSubmit = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault();
    const target = event.currentTarget;
    if (!(target instanceof HTMLFormElement)) return;
    const values = form.validate(target);
    if (values === null) return;
    setPending(true);
    setServerError(null);
    try {
      const response = await fetch("/api/extraction/white-glove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: values.email, jobId: props.jobId, reason: props.reason }),
      });
      if (!response.ok) {
        setServerError("We couldn't send that just now. Please try again.");
        return;
      }
      setSubmitted(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="mx-auto max-w-xl py-20">
      <h1 class="text-3xl font-semibold tracking-tight">Let's take a closer look</h1>
      <p class="text-muted-foreground mt-4 text-lg">{props.message}</p>
      <Show
        when={!submitted()}
        fallback={
          <p class="border-border bg-card mt-8 rounded-xl border p-6">
            Thanks — we've got your file and your email. We'll be in touch soon.
          </p>
        }
      >
        <form class="mt-8 space-y-3" onSubmit={onSubmit} novalidate>
          <Input type="email" name="email" placeholder="you@business.com" autocomplete="email" />
          <Show when={form.errors().email}>
            {(message) => <p class="text-destructive text-sm">{message()}</p>}
          </Show>
          <Show when={serverError()}>
            {(message) => <p class="text-destructive text-sm">{message()}</p>}
          </Show>
          <Button type="submit" disabled={pending()}>
            {pending() ? "Sending…" : "Send it to us"}
          </Button>
        </form>
      </Show>
    </div>
  );
};
