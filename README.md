# Business Decision Lab

Lightweight management-accounting decision support for small businesses.

Initial scope:
- company baseline and cost structure
- labor / equipment capacity
- order acceptance before/after impact
- relevant-cost separation from unchanged fixed costs
- explicit step-fixed costs when a decision actually changes capacity
- no fabricated future opportunity-loss estimate without sufficient evidence

Development policy: changes after repository initialization should go through `codex/*` branches and draft pull requests.

## v0.1 implementation branch

The first implementation intentionally focuses on deterministic, explainable inputs:
- unchanged fixed costs remain in company-level profitability, not incremental order cost
- step-fixed costs are included when the decision triggers them
- labor/equipment capacity is modeled explicitly
- opportunity loss is not guessed from insufficient history

Run:

```bash
npm test
npm run check
```
