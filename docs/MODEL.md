# Decision model v1

## Objective

Compare the current enterprise state with the state after accepting a specific order without pretending uncertain future demand is known.

## 1. Company-level accounting view

Revenue - Variable costs = Contribution - Fixed labor cost - Depreciation - Occupancy cost - Other fixed operating costs = Operating profit.

This view answers whether the company structure is profitable. These costs are not automatically reallocated into every incremental order decision.

## 2. Labor-time diagnostic

The model intentionally avoids revenue / employee count as an employee-value measure because revenue is jointly produced by labor, capital, equipment and other assets.

When detailed fixed-cost data exists, it also shows contribution minus explicit non-labor fixed costs, divided by available labor hours. This is a planning proxy, not a causal estimate of employee contribution.

## 3. Incremental order decision

Order revenue - materials - external processing - incremental labor - incremental equipment - other relevant cost - step-fixed cost - known opportunity cost = incremental contribution.

Unchanged rent, existing depreciation and other sunk/unchanged allocations are not charged again merely because an extra order is evaluated.

## 4. Capacity

Each resource has capacity hours, used hours, order-added hours, before/after utilization, remaining hours after the order, and a capacity-breach flag. A positive incremental contribution does not override a capacity breach.

## 5. Break-even

- Break-even order revenue = relevant-cost total
- Break-even unit price = relevant-cost total / units

## 6. Opportunity cost

The engine never invents future orders. Opportunity cost is included only when a known alternative order is displaced or a separately validated historical/statistical model supplies an estimate. Short histories alone are not treated as precise forecasts.

## 7. Multi-order prioritization

rankOrdersByBottleneck ranks candidate orders by decision status and incremental contribution per hour of the tightest used resource. It is a prioritization aid, not a full integer-programming production scheduler.

## Exclusions

- extraordinary/special losses unless explicitly relevant to the decision
- tax optimization
- financing decisions
- stochastic future-order opportunity-loss estimation
- causal employee performance attribution
