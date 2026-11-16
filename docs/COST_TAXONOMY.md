# Cost taxonomy and attribution rules

## Core principle

A cost has at least two separate questions:

1. **Where does it arise?** — labor, equipment, materials, occupancy, external supplier, shared overhead, financing, tax, other.
2. **Does this decision change it?** — if not, it usually does not belong in an incremental accept/reject calculation.

Do not infer relevance from attribution alone.

## Behavior classes

### Variable
Relevant only when the decision changes the amount.

Examples:
- materials consumed by the order
- overtime caused by the order
- electricity proportional to machine use

### Fixed
Company-level cost by default. It becomes relevant to the decision only when it is both:
- changed by the decision, and
- avoidable because of the decision.

Examples:
- existing monthly rent: normally excluded from one-order incremental decision
- new warehouse rent required by the order: relevant
- fixed salary already committed for the month: normally excluded
- additional temporary staffing contract triggered by the order: relevant

### Step-fixed
Relevant only when the threshold is actually triggered.

Examples:
- second shift supervisor
- new machine lease after current capacity is exceeded
- additional warehouse unit

### Sunk
Never used to choose between current alternatives because the cash/resource commitment is already irreversible.

Examples:
- past R&D
- already-paid setup/design work that cannot be recovered

### Allocated
Accounting allocation is not the same as economic relevance.

Examples:
- head-office overhead allocation
- shared depreciation allocation

Allocated cost is relevant only if the underlying resource cost actually changes and is avoidable.

### Opportunity
Relevant only when the foregone alternative is known or separately estimated with a defensible model.

Do not invent a future order or convert vague "lost opportunity" into yen.

## Attribution classes

Attribution is descriptive, not causal:

- labor
- equipment
- materials
- occupancy
- external
- shared
- financing
- tax
- other
- unknown

For example, depreciation may be attributed to equipment, but unchanged depreciation is not automatically a relevant cost for an incremental order.

## Enterprise view vs decision view

### Enterprise operating view

Use all normal operating costs required to evaluate whether the company structure is profitable:

Revenue
- variable operating costs
- fixed labor cost
- depreciation
- occupancy
- other fixed operating costs
= operating profit

Special/extraordinary items remain outside the default operating view unless the user explicitly chooses to analyze them.

### Incremental decision view

Use only costs that change because of the decision, plus known opportunity costs.

Order revenue
- incremental variable cost
- avoidable fixed cost
- triggered step-fixed cost
- known opportunity cost
= incremental contribution

## Anti-patterns

Do not:
- treat revenue / employee count as employee-created value
- assign all equipment-supported revenue to labor
- treat depreciation as incremental simply because it appears in product cost accounting
- treat an overhead allocation as avoidable cost
- omit a step-fixed cost when the decision actually triggers it
- turn qualitative supplier or strategic risk into yen without an explicit model
- fabricate opportunity cost from insufficient history

## API

The generic classifier accepts additional cost items with:

- name
- amount
- behavior
- attribution
- changesWithDecision
- avoidable
- triggered
- known
- enterpriseOperating

The classifier returns both incremental-relevant and excluded totals so the UI can show why a cost was included or excluded.
