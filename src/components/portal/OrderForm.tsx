import { createMemo, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import type { PortalConfig } from "@/portal-config";
import { api } from "@/lib/api";
import { MAX_LINE_QUANTITY } from "@/lib/order-limits";
import type { CartLineInput, Violation } from "@/server/orders/compute";
import { computeTotals } from "@/server/orders/compute";
import type { Order } from "@/server/orders/order";
import { catalogProducts } from "./catalog-data";
import { formatMoney } from "./money";

const errorBodyMessage = (value: unknown): string | null => {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null &&
    "message" in value.error &&
    typeof value.error.message === "string"
  ) {
    return value.error.message;
  }
  return null;
};

export interface BuyerLinkAttribution {
  token: string;
  buyerName: string;
  contact: string | null;
}

export interface OrderFormProps {
  config: PortalConfig;
  slug: string;
  attribution?: BuyerLinkAttribution;
}

export const OrderForm = (props: OrderFormProps) => {
  const products = createMemo(() => catalogProducts(props.config));
  const [quantities, setQuantities] = createStore<Record<string, number>>({});
  const nameLocked = () => props.attribution !== undefined;
  const contactLocked = () => props.attribution?.contact != null;
  const [buyerName, setBuyerName] = createSignal(props.attribution?.buyerName ?? "");
  const [buyerContact, setBuyerContact] = createSignal(props.attribution?.contact ?? "");
  const [submitting, setSubmitting] = createSignal(false);
  const [submitError, setSubmitError] = createSignal<string | null>(null);
  const [serverViolations, setServerViolations] = createSignal<Violation[]>([]);
  const [confirmed, setConfirmed] = createSignal<Order | null>(null);

  const quantityFor = (productId: string) => quantities[productId] ?? 0;

  const setQuantity = (productId: string, next: number) => {
    setQuantities(productId, Math.min(MAX_LINE_QUANTITY, Math.max(0, Math.trunc(next))));
  };

  const cartLines = createMemo<CartLineInput[]>(() =>
    products()
      .filter((product) => quantityFor(product.id) > 0)
      .map((product) => ({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        categoryId: product.categoryId,
        unitPrice: product.unitPrice,
        quantity: quantityFor(product.id),
      })),
  );

  const totals = createMemo(() => computeTotals(props.config.rules, { lines: cartLines() }));

  const canSubmit = createMemo(
    () =>
      !submitting() &&
      cartLines().length > 0 &&
      totals().violations.length === 0 &&
      buyerName().trim().length > 0 &&
      buyerContact().trim().length > 0,
  );

  const submit = async () => {
    if (!canSubmit()) return;
    setSubmitting(true);
    setSubmitError(null);
    setServerViolations([]);
    try {
      const { data, error } = await api.portal({ slug: props.slug }).orders.post({
        buyer: { name: buyerName().trim(), contact: buyerContact().trim() },
        lines: cartLines().map((line) => ({ productId: line.productId, quantity: line.quantity })),
        buyerLinkToken: props.attribution?.token ?? null,
      });
      if (error) {
        const bodyMessage = errorBodyMessage(error.value);
        setSubmitError(
          (error.status as number) === 409 && bodyMessage
            ? bodyMessage
            : "We couldn't submit your order. Please try again.",
        );
        return;
      }
      if (data.ok) {
        setConfirmed(data.order);
      } else {
        setServerViolations(data.violations);
      }
    } catch {
      setSubmitError("We couldn't submit your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formView = () => (
    <section class="flex flex-col gap-8 py-10">
        <div class="flex flex-col gap-1">
          <h1
            class="text-3xl font-bold"
            style={{ "font-family": "var(--portal-font-heading)" }}
          >
            Order Form
          </h1>
          <p class="text-[var(--portal-foreground)]/70">
            Choose quantities and submit your order to {props.config.business.name}.
          </p>
        </div>

        <div class="flex flex-col gap-3">
          <For each={products()}>
            {(product) => (
              <div class="flex items-center justify-between gap-4 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/10 p-4">
                <div class="flex flex-col">
                  <span class="font-medium">{product.name}</span>
                  <span class="text-sm text-[var(--portal-foreground)]/60">
                    {formatMoney(product.unitPrice)}
                    <Show when={product.unit}> / {product.unit}</Show>
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Decrease ${product.name}`}
                    class="h-8 w-8 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/20"
                    onClick={() => setQuantity(product.id, quantityFor(product.id) - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    inputmode="numeric"
                    aria-label={`Quantity of ${product.name}`}
                    class="w-16 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/20 bg-transparent px-2 py-1 text-center"
                    value={quantityFor(product.id)}
                    onInput={(event) => setQuantity(product.id, Number(event.currentTarget.value))}
                  />
                  <button
                    type="button"
                    aria-label={`Increase ${product.name}`}
                    class="h-8 w-8 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/20"
                    onClick={() => setQuantity(product.id, quantityFor(product.id) + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>

        <div class="flex flex-col gap-2 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/10 p-4">
          <div class="flex justify-between">
            <span class="text-[var(--portal-foreground)]/70">Subtotal</span>
            <span class="font-medium">{formatMoney(totals().subtotal)}</span>
          </div>
          <Show when={totals().tax}>
            {(tax) => (
              <div class="flex justify-between">
                <span class="text-[var(--portal-foreground)]/70">Tax</span>
                <span class="font-medium">{formatMoney(tax())}</span>
              </div>
            )}
          </Show>
          <div class="flex justify-between border-t border-[var(--portal-foreground)]/10 pt-2">
            <span class="font-semibold">Total</span>
            <span class="font-semibold text-[var(--portal-primary)]">
              {formatMoney(totals().total)}
            </span>
          </div>
        </div>

        <Show when={totals().violations.length > 0 || serverViolations().length > 0}>
          <ul class="flex flex-col gap-1 rounded-[var(--portal-radius)] border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-600">
            <For each={[...totals().violations, ...serverViolations()]}>
              {(violation) => <li>{violation.message}</li>}
            </For>
          </ul>
        </Show>

        <div class="flex flex-col gap-3">
          <Show when={nameLocked()}>
            <p class="text-sm text-[var(--portal-foreground)]/70">
              Ordering as <span class="font-medium text-[var(--portal-foreground)]">{buyerName()}</span>.
            </p>
          </Show>
          <Show when={!nameLocked()}>
            <label class="flex flex-col gap-1">
              <span class="text-sm text-[var(--portal-foreground)]/70">Your name</span>
              <input
                type="text"
                value={buyerName()}
                onInput={(event) => setBuyerName(event.currentTarget.value)}
                class="rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/20 bg-transparent px-3 py-2"
              />
            </label>
          </Show>
          <label class="flex flex-col gap-1">
            <span class="text-sm text-[var(--portal-foreground)]/70">Email or phone</span>
            <input
              type="text"
              value={buyerContact()}
              disabled={contactLocked()}
              onInput={(event) => setBuyerContact(event.currentTarget.value)}
              class="rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/20 bg-transparent px-3 py-2 disabled:opacity-60"
            />
          </label>
        </div>

        <Show when={submitError()}>
          {(message) => <p class="text-sm text-red-600">{message()}</p>}
        </Show>

        <button
          type="button"
          disabled={!canSubmit()}
          onClick={() => void submit()}
          class="rounded-[var(--portal-radius)] bg-[var(--portal-primary)] px-6 py-3 font-medium text-[var(--portal-background)] disabled:opacity-50"
        >
          {submitting() ? "Submitting…" : "Submit order"}
        </button>
      </section>
  );

  return (
    <Show when={confirmed()} fallback={formView()}>
      {(order) => <Confirmation order={order()} />}
    </Show>
  );
};

const Confirmation = (props: { order: Order }) => (
  <section class="flex flex-col gap-6 py-10">
    <div class="flex flex-col gap-1">
      <h1
        class="text-3xl font-bold"
        style={{ "font-family": "var(--portal-font-heading)" }}
      >
        Order received
      </h1>
      <p class="text-[var(--portal-foreground)]/70">
        Your order number is <span class="font-mono">{props.order.id}</span>.
      </p>
    </div>

    <div class="flex flex-col gap-2 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/10 p-4">
      <For each={props.order.lines}>
        {(line) => (
          <div class="flex justify-between gap-4">
            <span>
              {line.name} × {line.quantity}
              <Show when={!line.available}>
                <span class="ml-2 text-sm text-red-600">no longer available</span>
              </Show>
            </span>
            <span class="font-medium">{formatMoney(line.lineTotal)}</span>
          </div>
        )}
      </For>
      <div class="mt-2 flex justify-between border-t border-[var(--portal-foreground)]/10 pt-2">
        <span class="text-[var(--portal-foreground)]/70">Subtotal</span>
        <span>{formatMoney(props.order.subtotal)}</span>
      </div>
      <Show when={props.order.tax}>
        {(tax) => (
          <div class="flex justify-between">
            <span class="text-[var(--portal-foreground)]/70">Tax</span>
            <span>{formatMoney(tax())}</span>
          </div>
        )}
      </Show>
      <div class="flex justify-between">
        <span class="font-semibold">Total</span>
        <span class="font-semibold text-[var(--portal-primary)]">
          {formatMoney(props.order.total)}
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-2 rounded-[var(--portal-radius)] border border-[var(--portal-foreground)]/10 p-4">
      <h2 class="font-semibold">Payment instructions</h2>
      <p class="whitespace-pre-line text-[var(--portal-foreground)]/80">
        {props.order.paymentInstructions}
      </p>
    </div>
  </section>
);
