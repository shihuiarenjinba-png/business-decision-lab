# Business Decision Lab

Local-first management-accounting decision support for small businesses.

## What it decides

Business Decision Lab evaluates a specific order against the company's current cost structure and capacity.

It separates company-wide revenue/profitability, variable costs, fixed labor cost, depreciation, occupancy, other fixed operating cost, labor/equipment capacity, order-specific relevant costs, step-fixed costs, and explicitly known opportunity cost.

It does **not** treat revenue per employee as employee-attributable output. Machinery, capital, occupancy and other resources also support revenue. The UI therefore reports enterprise-wide profitability and a clearly labeled residual-per-labor-capacity proxy instead of claiming a causal employee productivity number.

## Decision outputs

- incremental contribution
- relevant-cost total
- break-even order revenue
- break-even unit price
- before/after operating profit
- operating-profit change rate
- labor/equipment utilization before and after
- bottleneck ranking
- ACCEPT / HOLD / REJECT signal

A profitable order is still placed on HOLD when it breaches current capacity.

The UI also includes:

- a Generic Cost Item Editor that keeps behavior, attribution and relevance separate
- explicit INCLUDE / EXCLUDE reasons for every additional cost
- a Cost Bridge between the enterprise operating view and incremental order view
- multi-order bottleneck ranking and Current / accepted-order scenario comparison
- manufacturing, service, capacity, avoidable-fixed, allocated, sunk and known-opportunity fixtures
- local JSON and CSV import/export for the company profile and candidate orders

## Local UI

No account or external API is required for the calculation engine.

    npm test
    npm run check
    npm start

Open: http://localhost:8765/public/

The company profile and candidate orders can be stored in browser localStorage or moved as JSON/CSV. No company data is uploaded by the local UI.

## Model boundary

Unchanged fixed costs remain important for company profitability but are not charged again to an incremental accept/reject decision. Cost attribution (labor/equipment/materials/etc.) is kept separate from economic relevance (whether the decision changes or avoids the cost).

Relevant costs include order materials, incremental labor/overtime, incremental equipment, external processing, avoidable fixed costs, decision-triggered step-fixed costs, and known displaced-order opportunity cost. Sunk costs and unchanged allocations are excluded from the incremental decision even when accounting systems assign them to a product or department.

Existing rent, unchanged depreciation, and unchanged head-office allocations are normally irrelevant to a one-order incremental decision unless the decision actually changes them.

## Repository workflow

- main is the source of truth
- implementation work uses codex/* branches
- GitHub Actions runs tests and syntax checks
- Cloudflare/Stripe are optional future commercial layers; calculation correctness does not depend on either

See docs/MODEL.md, docs/COST_TAXONOMY.md, and docs/LOCAL_CONNECTION_PLAN.md.

## Current scope

The engine is deterministic and explainable. It does not fabricate future opportunity loss from short histories and does not claim to estimate causal employee productivity. Historical order-acceptance or opportunity-cost models can be added later only with explicit data-sufficiency rules.
