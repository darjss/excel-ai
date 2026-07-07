# AI stack: Flue harness, Workers AI models, deterministic facts layer

The Extraction agent runs on the Flue framework (withastro/flue, pinned at its 1.0 beta — breaking-change churn accepted deliberately), which layers on the Cloudflare Agents SDK: DO-backed sessions, scheduling for Import polling, and Durable Streams progress streaming. The platform UI is Solid, so the client consumes `@flue/sdk` (framework-agnostic) through a small Solid primitive over `observe()`'s getSnapshot/subscribe — never the raw stream chunks, which Flue marks unstable. Flue's undocumented structured output is neutralized at our boundary: PortalConfig is valibot-validated with a repair-retry loop before anything reaches the Review Screen.

Models run on Workers AI (account billing, no external API keys), fronted by AI Gateway so every slot is swappable config: **GLM 5.2** (`@cf/zai-org/glm-5.2`) for extraction reasoning, **Kimi K2.7** (`@cf/moonshotai/kimi-k2.7-code`) for cheap auxiliary work (dump compaction, wrong-species classification, copy drafts). Chosen from a live head-to-head bench (2026-07-07, judged adversarially against a frontier baseline on real fixtures): GLM scored 4/4/4 on purchase-order and caught the hardcoded-total bug; Kimi scored 4/2/3, 4/2/4, 3/4/4 — reliable agentic tool use but it misreads money values, asserts absences when its tools fail, and invents plausible validations. Frontier APIs were rejected for product economics; an escalation tier via AI Gateway remains a config change if ever needed.

Two structural consequences, both mandatory regardless of model:
1. **The deterministic layer owns facts.** Formulas, data validations, conditional formatting, merged ranges, and protection flags come from the SheetJS parse and are never asked of an LLM — every judged failure across all models (including the frontier's) lived in this layer.
2. **A deterministic formula verifier gates money math.** Every rule the model claims is recomputed against the parsed formula graph before entering PortalConfig.

Workers AI loop gotchas (from the bench): the binding already returns OpenAI-shaped responses with tool_calls; use `max_completion_tokens` (not `max_tokens`); budget generously because reasoning content consumes the completion budget (starvation returns empty content with finish_reason "length"); never call through `wrangler dev` in production paths — it crashes silently and hangs clients.

Supporting choices: Resend behind the starter's sendEmail seam; R2 for uploaded workbooks; Import polling via Flue scheduling on the per-Supplier DO.
