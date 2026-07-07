---
status: proposed
---

# Shared Worker, Durable Object per Supplier

All Portals are served by one shared Worker; each Supplier's data lives in a SQLite-backed Durable Object addressed by `idFromName(supplierId)`. Chosen over D1-per-tenant (requires a binding per database — unmanageable at scale) and over Workers for Platforms (only needed for per-tenant code, which ADR-0003 rejects). Portals get free subdomains by default; custom hostnames (Cloudflare for SaaS, $0.10/mo past the first 100) are a paid upsell — the only real per-tenant marginal cost. (2026-07 Cloudflare economics research.)
