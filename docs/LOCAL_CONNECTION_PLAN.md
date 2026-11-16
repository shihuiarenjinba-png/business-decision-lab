# Local development and connection plan

## Goal
Keep Business Decision Lab safe to run locally first, then connect external services only when each boundary is ready.

## Phase A — local-only
1. Clone the repository.
2. Install Node.js 22+.
3. Run `npm test` and `npm run check`.
4. Keep all company/order inputs local.
5. Do not require Stripe, Cloudflare, GitHub APIs, or external LLM APIs for the calculation engine.

## Phase B — local web UI
Planned local runtime:
- static frontend
- local decision engine
- browser/local storage for draft company profiles
- import/export JSON/CSV
- no production secrets

## Phase C — GitHub
- work on `codex/*` branches
- CI must pass before merge
- main is the source of truth
- deployment provenance must retain commit SHA

## Phase D — Cloudflare
Cloudflare is optional for calculation correctness. When connected:
- separate preview and production
- use explicit account alias/account ID
- never infer the target account
- secrets only in Cloudflare secret storage
- no customer accounting files uploaded by default

## Phase E — Stripe
Only needed if/when the product becomes paid:
- TEST first
- LIVE separately
- Product/Price/Webhook IDs stored as configuration references, not guessed
- entitlement controlled by Stripe subscription state
- payment integration must not alter calculation results

## Current scope
v0.1 remains deterministic management-accounting decision support. Historical opportunity-loss models are not enabled until data-sufficiency rules are defined.
