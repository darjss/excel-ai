---
status: accepted
---

# Portals render from PortalConfig plus an AI style layer, not generated code

Despite the vibecoding framing, no per-Supplier code is generated. Extraction produces a typed PortalConfig; one hand-written set of portal components renders every Portal from it. The AI owns a rich brand/style layer inside that config — theme tokens derived from the Supplier's logo/site, all portal copy, section arrangement from a constrained set — so setup still feels generative without creating per-tenant forks.

Codegen was seriously considered and rejected: generation is the commoditized part of the market (Lovable/Bolt/v0 own it and still can't touch the extraction wedge), per-tenant codebases turn every fix into a migration across forks, Suppliers never open the code so code ownership is worth nothing to them, and config keeps hosting on one shared Worker (no Workers for Platforms, no sandboxing, no generated-code security review). Nothing is lost if codegen comes later: PortalConfig is the intermediate representation a future code generator would consume as its spec. Components the AI wishes existed are proposed, human-reviewed once, and added to the shared library rather than emitted per tenant.
