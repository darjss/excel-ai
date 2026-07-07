import { useNavigate } from "@solidjs/router";
import { createSignal } from "solid-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const OrdersLanding = () => {
  const navigate = useNavigate();
  const [slug, setSlug] = createSignal("");

  const open = (event: SubmitEvent) => {
    event.preventDefault();
    const value = slug().trim();
    if (value) navigate(`/orders/${encodeURIComponent(value)}`);
  };

  return (
    <div class="mx-auto max-w-md">
      <h1 class="text-2xl font-bold">Orders</h1>
      <p class="text-muted-foreground mt-2 text-sm">
        Open the order dashboard for one of your published Portals by its slug.
      </p>
      <form onSubmit={open} class="mt-6 flex items-end gap-2">
        <div class="flex-1">
          <Label for="orders-slug">Portal slug</Label>
          <Input
            id="orders-slug"
            value={slug()}
            onInput={(event) => setSlug(event.currentTarget.value)}
            placeholder="bakery"
          />
        </div>
        <Button type="submit">Open</Button>
      </form>
    </div>
  );
};
