# Code owner handoff — Business Decision Lab — 2026-11-16

## Repository

- Repository: shihuiarenjinba-png/business-decision-lab
- Handoff branch: codex/cost-taxonomy-handoff-20261116
- Pull request: #3
- Base: main

## Product objective

Build a local-first management-accounting decision tool that answers:

- Should this order be accepted?
- How does the order change company-wide operating profit?
- Which labor/equipment resource becomes the bottleneck?
- What order revenue/unit price is required to break even?
- Which candidate order has the strongest contribution per constrained resource hour?

The product must remain explainable. Do not fabricate precision for future opportunity loss or employee productivity.

## Accounting model — non-negotiable

### Separate attribution from relevance

A cost can be attributed to labor, equipment, materials, occupancy, external suppliers, shared overhead, financing, tax, other, or unknown.

That attribution does **not** decide whether the cost belongs in an incremental decision.

Incremental relevance is determined by whether the decision actually changes or avoids the economic resource consumption/cash flow.

### Enterprise operating view

Normal operating costs remain visible when evaluating the company structure:

Revenue
- variable operating costs
- fixed labor cost
- depreciation
- occupancy
- other fixed operating costs
= operating profit

Do not attribute all revenue or contribution to employees. Labor, capital, equipment, materials, occupancy and other assets jointly support output.

### Incremental order view

Use only decision-changing costs plus known opportunity cost:

Order revenue
- incremental variable cost
- avoidable fixed cost
- triggered step-fixed cost
- known opportunity cost
= incremental contribution

### Cost behavior

- Variable: relevant only when the decision changes the amount.
- Fixed: relevant only when changed by the decision and avoidable.
- Step-fixed: relevant only when the threshold is actually triggered.
- Sunk: excluded from current alternative selection.
- Allocated: accounting allocation alone does not make it economically relevant.
- Opportunity: relevant only when known or supplied by a separately validated model.

Examples:
- existing monthly rent: enterprise cost, normally excluded from a one-order incremental decision
- new warehouse required by an order: relevant
- existing depreciation: enterprise cost, normally not incremental
- new machine lease triggered by the order: relevant
- head-office allocation: excluded unless the underlying cost is actually avoidable
- past R&D: sunk
- displaced confirmed order: opportunity cost may be entered
- hypothetical future order from insufficient history: do not monetize

See docs/COST_TAXONOMY.md.

## Current implementation

### Engine
- public/decision.js
- public/costs.js
- src/decision.js
- src/costs.js

Implemented:
- company baseline
- detailed fixed-cost structure
- residual-before-fixed-labor diagnostic
- relevant-cost order evaluation
- generic additional cost classification
- step-fixed cost
- known opportunity cost
- labor/equipment capacity
- bottleneck sorting
- break-even revenue
- break-even unit price
- ACCEPT / HOLD / REJECT
- multi-order bottleneck ranking

### UI
- public/index.html
- public/app.js
- public/styles.css

Current UI supports company baseline, one-order evaluation, localStorage and JSON export.

### Windows local verification

Run:

PowerShell -ExecutionPolicy Bypass -File .\scripts\local_verify.ps1 -Serve

Then open:

http://localhost:8765/public/

No Stripe/Cloudflare/API credentials are required for v1 calculations.

## Tests and CI

- node --test tests/*.test.mjs
- npm run check
- GitHub Actions: .github/workflows/ci.yml

Cost taxonomy tests cover:
- unchanged labor/equipment fixed cost exclusion from incremental decisions
- avoidable fixed costs
- allocated overhead
- sunk costs
- known vs unknown opportunity cost
- separation of attribution and relevance
- integration of additional classified costs into order evaluation

## Next implementation tasks

Priority order:

1. Add a UI editor for additional cost items using the generic taxonomy.
   - name
   - amount
   - behavior
   - attribution
   - changesWithDecision
   - avoidable
   - triggered
   - known
   - show include/exclude reason

2. Add a transparent cost bridge:
   - enterprise operating cost
   - incremental relevant cost
   - excluded incremental cost
   - reason for exclusion
   Users must be able to see why a cost is or is not counted.

3. Add multiple-order comparison UI using rankOrdersByBottleneck.
   Do not turn it into a production scheduler yet.

4. Add CSV/JSON import/export for company profile and candidate orders.
   Keep the default data flow local-only.

5. Add scenario comparison:
   - current
   - accept order A
   - accept order B
   - capacity-triggered step-fixed scenario
   Avoid probabilistic future-order assumptions.

6. Improve input validation and Japanese/English UI labels.

7. Only after local Windows QA passes, prepare Cloudflare Preview deployment.
   Cloudflare must remain optional for calculation correctness.
   Do not add Stripe until pricing/product scope is explicitly approved.

## Do not do

- Do not use revenue / employee count as employee productivity.
- Do not treat allocated accounting cost as automatically relevant.
- Do not omit unavoidable enterprise costs from the company-wide profitability view.
- Do not charge unchanged fixed costs again to a one-order decision.
- Do not omit a genuinely triggered step-fixed cost.
- Do not monetize qualitative risks without a defensible expected-cost model.
- Do not fabricate future orders/opportunity loss from short history.
- Do not add paid external LLM APIs.
- Do not commit secrets.
- Do not silently deploy to production.
- Do not mix this repository with make-or-buy-lab; shared concepts may be extracted later only after both models stabilize.

## Acceptance gate before commercial work

- all tests green
- Windows local verification PASS
- UI cost inclusion/exclusion is auditable
- at least one manufacturing-style fixture and one service-style fixture
- capacity breach fixture
- avoidable-fixed-cost fixture
- allocated-overhead exclusion fixture
- known-opportunity-cost fixture
- no external service required for core calculation

After these pass, hand back a concise report with exact commit SHA, test counts, remaining limitations, and whether Cloudflare Preview is safe to begin.
