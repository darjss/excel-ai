# SolidJS Rules

## Reference Code

- Check [references/opencode](/home/darjs/dev/excel-ai/references/opencode) for Solid UI patterns, AI chat/workspace UX, streaming interaction patterns, and reusable component ideas.
- Check [references/vibesdk](/home/darjs/dev/excel-ai/references/vibesdk) for sandboxing, preview routing, deployment, template/bootstrap, and other Cloudflare runtime substrate references.
- If a suitable UI component does not already exist locally, check Zaidan for Kobalte-compatible components with the project's selected setup: `https://zaidan.carere.dev/?primitive=kobalte&style=vega&baseColor=neutral&theme=neutral&font=inter&radius=default&menuAccent=subtle`.
- Add Zaidan components through the configured registry with `pnpm dlx shadcn@latest add @zaidan/<component>`; for example, `pnpm dlx shadcn@latest add @zaidan/button`.
- Use these directories as reference material only. Reuse patterns and small pieces intentionally; do not copy their architecture wholesale.

## Mental Model

- MUST: Treat components as setup functions that run ONCE, not render functions.
- MUST: Place reactive work in primitives (`createMemo`, `createEffect`, `<Show>`, `<For>`), not component body.
- MUST: Access signals only inside reactive contexts (JSX expressions, effects, memos).

## Reactivity

- MUST: Call signals as functions: `count()` not `count`.
- MUST: Use functional updates when new state depends on old: `setCount((prev) => prev + 1)`.
- MUST: Keep signals atomic (one per value) — one big state object loses granularity.
- MUST: Use derived functions `() => count() * 2` for cheap/infrequent derivations.
- MUST: Use `createMemo(() => ...)` for expensive/frequent derivations — caches result.
- MUST: Use `createEffect` for side effects only (DOM, localStorage, subscriptions).
- MUST: Call `onCleanup(() => ...)` inside effects for subscriptions/intervals/listeners.
- MUST: Use path syntax for store updates: `setStore("users", 0, "name", "Jane")`.
- MUST: Wrap store props in arrow for `on()`: `on(() => store.value, fn)` not `on(store.value, fn)`.
- SHOULD: Use `{ equals: false }` for trigger signals that always notify.
- SHOULD: Use `batch(() => { ... })` when updating multiple signals outside event handlers.
- SHOULD: Use `on(dep, fn)` for explicit effect dependencies.
- SHOULD: Use `untrack(() => value())` to read without subscribing.
- SHOULD: Use `createStore({ ... })` for nested objects with fine-grained reactivity.
- SHOULD: Use `produce(draft => { ... })` for complex store mutations.
- NEVER: Derive state via `createEffect(() => setX(y()))` — use memo or derived function.
- NEVER: Place side effects inside `createMemo` — causes infinite loops/crashes.

## Props

- MUST: Access props via `props.title`, not destructuring.
- SHOULD: Wrap in getter if needed: `const title = () => props.title`.
- SHOULD: Use `splitProps(props, ["keys"])` to separate local from pass-through props.
- SHOULD: Use `mergeProps(defaults, props)` for default values.
- SHOULD: Use `children(() => props.children)` only when transforming, otherwise `{props.children}`.
- NEVER: Destructure props `({ title })` — breaks reactivity.

## Control Flow

- MUST: Use `<For each={items()}>` for object arrays — item is value, index is signal.
- MUST: Use `<Index each={items()}>` for primitives/inputs — item is signal, index is number.
- MUST: Use `<Suspense fallback={...}>` for async, not `<Show when={!loading}>`.
- MUST: Access resource states via `data()`, `data.loading`, `data.error`, `data.latest`.
- SHOULD: Use `<Show when={cond()} fallback={...}>` for conditionals.
- SHOULD: Use `<Show when={val}>` callback for type narrowing: `{(v) => <div>{v().name}</div>}`.
- SHOULD: Use `<Switch>/<Match>` for multiple conditions.
- SHOULD: Use `createResource(source, fetcher)` for reactive async data.
- SHOULD: Use `<ErrorBoundary fallback={(err, reset) => ...}>` for render errors.
- NEVER: Use `.map()` in JSX — use `<For>` or `<Index>`.
- NEVER: Rely on ErrorBoundary for event handler or setTimeout errors — use try/catch.

## JSX & DOM

- MUST: Use `class` not `className`.
- MUST: Combine static `class="btn"` with reactive `classList={{ active: isActive() }}`.
- MUST: Use `onClick` for delegated events; `on:click` for native (element-level).
- MUST: Condition inside handler since events are not reactive: `onClick={() => props.onClick?.()}`.
- MUST: Read refs in `onMount` or effects — refs connect after render.
- MUST: Call `onCleanup` inside directives for cleanup.
- SHOULD: Use `on:click` for `stopPropagation`, capture, passive, or custom events.
- SHOULD: Use `style={{ color: color(), "--css-var": value() }}` for inline styles.
- SHOULD: Type refs as `let el: HTMLElement | undefined` with guard.
- SHOULD: Use `use:directiveName={accessor}` for reusable DOM behaviors.
- NEVER: Mix reactive `class={x()}` with `classList`.

# Stack conventions

Astro 7 SSR on Cloudflare Workers. SolidJS islands (never React). Tailwind v4 — theme lives in `src/styles/global.css` + `src/styles/base.css` (Zaidan vega; don't hand-edit base.css).

## Layout

- `src/pages` — Astro routes; `/app/[...path].astro` hosts the Solid SPA (`src/components/app`), `/api/[...slug].ts` hosts Elysia (`src/server/api`)
- `src/server` — API (`api/`), db (`db/`), auth (`lib/auth.ts`), billing seam (`billing/`), agent harness (`agents/`)
- `src/lib` — client-shared code: Eden client (`api.ts`), auth client, plans, cache map, form helper, queries
- `src/middleware` — edge cache + session guard

## Rules

- Strict TS, no `any`, no type assertions, named exports only, no classes except the error hierarchy (`AppError`, `ApiError`)
- No inline comments except the TODO seams already present
- Files stay small and single-purpose; ~150 lines needs a reason
- API: one Elysia plugin per concern, TypeBox `t` validation, throw `AppError` subclasses; keep `aot: false`
- Client data: solid-query through the shared `queryClient`; mutations invalidate queries — never poke the cache
- Forms: hand-rolled + valibot via `createForm` (no tanstack form)
- Icons: `lucide-solid/icons/<name>` deep imports only — the barrel import breaks SSR in workerd
- UI components: `pnpm dlx shadcn@latest add @zaidan/<name>` into `src/components/ui`
- DB: cuid2 ids + createdAt/updatedAt via `src/server/db/columns.ts`; explicit indexes; after schema changes run `pnpm db:generate && pnpm db:migrate:local`
- Auth schema changes (new plugins): edit `scripts/auth-schema.config.ts` to match `src/server/lib/auth.ts`, run `pnpm auth:generate`
- Env vars: add to `src/env.ts` (valibot), `.dev.vars.example`, and `wrangler.jsonc` vars if public; rerun `wrangler types`

## Verify

`pnpm typecheck && pnpm lint && pnpm build`, then `pnpm dev` and curl `/api/health`.

# Sheetstand specifics

Sheetstand turns a Supplier's Source Sheet into a hosted, Buyer-facing order Portal. Read these before naming anything or changing architecture:

- `CONTEXT.md` — the ubiquitous language. Use Supplier, Buyer, Portal, PortalConfig, Source Sheet, Extraction, Review Screen, Import, Orders Tab, Publish exactly as defined there; honor the `_Avoid_` lists.
- `docs/adr/` — accepted architecture decisions (order-portal wedge, Google Sheets `drive.file` one-way Import, config-not-codegen, shared Worker + Durable Object per Supplier, no Buyer payments, and the AI stack).

The Extraction agent runs on the Flue harness (`@flue/runtime`, pinned to an exact 1.0 beta per ADR-0006) layered on the Cloudflare Agents SDK: per-Supplier SQLite Durable Objects, scheduling for Import polling, and streaming progress. Flue generates its Durable Object classes and bindings; wrangler `migrations` entries are append-only and order-stable — append a uniquely tagged migration when adding an agent, never rewrite deployed history. The deterministic layer (SheetJS parse) owns facts (formulas, validations, merges, protection); never ask an LLM for them, and gate money math through a formula verifier before it enters PortalConfig.

# Agent skills

## Issue tracker

Issues are tracked on GitHub (darjss/excel-ai) via the `gh` CLI; external PRs are not a triage surface. See `docs/agents/issue-tracker.md`.

## Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

## Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
</content>
