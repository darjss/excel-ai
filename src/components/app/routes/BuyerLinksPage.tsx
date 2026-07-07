import { createSignal, For, Match, Show, Switch } from "solid-js";
import { toast } from "solid-sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryErrorMessage } from "@/lib/api";
import {
  useBuyerLinks,
  useCreateBuyerLink,
  useRevokeBuyerLink,
} from "@/lib/queries/buyer-links";

const linkUrl = (slug: string, token: string) =>
  `${window.location.origin}/portal/${slug}/o/${token}`;

export const BuyerLinksPage = () => {
  const [slug, setSlug] = createSignal("");
  const [buyerName, setBuyerName] = createSignal("");
  const [contact, setContact] = createSignal("");

  const links = useBuyerLinks(slug);
  const createLink = useCreateBuyerLink(slug);
  const revokeLink = useRevokeBuyerLink(slug);

  const create = (event: SubmitEvent) => {
    event.preventDefault();
    const name = buyerName().trim();
    if (!slug().trim() || !name) return;
    createLink.mutate(
      { buyerName: name, contact: contact().trim() || undefined },
      {
        onSuccess: () => {
          setBuyerName("");
          setContact("");
        },
        onError: (error) => toast.error(queryErrorMessage(error)),
      },
    );
  };

  const revoke = (token: string) =>
    revokeLink.mutate(token, {
      onError: (error) => toast.error(queryErrorMessage(error)),
    });

  const regenerate = (link: { token: string; buyerName: string; contact?: string }) =>
    revokeLink.mutate(link.token, {
      onSuccess: () =>
        createLink.mutate(
          { buyerName: link.buyerName, contact: link.contact },
          { onError: (error) => toast.error(queryErrorMessage(error)) },
        ),
      onError: (error) => toast.error(queryErrorMessage(error)),
    });

  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  return (
    <div class="mx-auto max-w-2xl">
      <h1 class="text-2xl font-bold">Buyer links</h1>
      <p class="text-muted-foreground mt-1 text-sm">
        Named links attribute every order to a known buyer. Revoke a leaked link and regenerate a
        fresh one in seconds.
      </p>

      <label class="mt-6 block">
        <span class="text-sm font-medium">Portal slug</span>
        <Input
          value={slug()}
          onInput={(event) => setSlug(event.currentTarget.value)}
          placeholder="your-portal-slug"
          class="mt-1"
        />
      </label>

      <form onSubmit={create} class="mt-6 flex items-start gap-2">
        <div class="flex flex-1 flex-col gap-2">
          <Input
            value={buyerName()}
            onInput={(event) => setBuyerName(event.currentTarget.value)}
            placeholder="Buyer name"
          />
          <Input
            value={contact()}
            onInput={(event) => setContact(event.currentTarget.value)}
            placeholder="Contact (optional)"
          />
        </div>
        <Button type="submit" disabled={createLink.isPending || !slug().trim()}>
          Create link
        </Button>
      </form>

      <Show when={slug().trim().length > 0}>
        <Switch>
          <Match when={links.isPending}>
            <p class="text-muted-foreground mt-6 text-sm">Loading…</p>
          </Match>
          <Match when={links.isError}>
            <p class="text-destructive mt-6 text-sm">{queryErrorMessage(links.error)}</p>
          </Match>
          <Match when={links.data}>
            {(list) => (
              <ul class="mt-6 divide-y rounded-lg border">
                <For
                  each={list()}
                  fallback={<li class="text-muted-foreground p-4 text-sm">No buyer links yet.</li>}
                >
                  {(link) => (
                    <li class="flex flex-col gap-2 p-4">
                      <div class="flex items-center justify-between gap-2">
                        <div>
                          <span class="font-medium">{link.buyerName}</span>
                          <Show when={link.contact}>
                            <span class="text-muted-foreground ml-2 text-sm">{link.contact}</span>
                          </Show>
                        </div>
                        <Show
                          when={link.revokedAt == null}
                          fallback={<span class="text-muted-foreground text-xs">Revoked</span>}
                        >
                          <span class="text-xs text-green-600">Active</span>
                        </Show>
                      </div>
                      <Show when={link.revokedAt == null}>
                        <div class="flex items-center gap-2">
                          <code class="bg-muted flex-1 truncate rounded px-2 py-1 text-xs">
                            {linkUrl(slug(), link.token)}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void copy(linkUrl(slug(), link.token))}
                          >
                            Copy
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => regenerate(link)}
                            disabled={revokeLink.isPending || createLink.isPending}
                          >
                            Regenerate
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => revoke(link.token)}
                            disabled={revokeLink.isPending}
                          >
                            Revoke
                          </Button>
                        </div>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            )}
          </Match>
        </Switch>
      </Show>
    </div>
  );
};
