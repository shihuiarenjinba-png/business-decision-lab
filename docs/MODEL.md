# Decision model v0.1

## Goal
Compare the current company state with the state after accepting a specific order without pretending that uncertain future demand is known.

## Two views
1. **Long-run company structure**: revenue, variable costs, normal fixed operating costs, contribution, operating profit, labor/equipment capacity.
2. **Incremental order decision**: only costs and capacity changes caused by the order, plus any explicitly known opportunity cost.

## Important accounting rule
An unchanged monthly rent or other fixed operating cost is part of the company's long-run profitability, but it is not charged again merely because one extra order is evaluated. If an order forces a new machine lease, new shift, new warehouse, or other step-fixed commitment, that incremental fixed cost is relevant and must be included.

## Capacity
Resources are explicit objects with available and used hours. An order can be profitable on incremental cost and still be placed on HOLD if it exceeds a labor/equipment bottleneck.

## Opportunity loss
v0.1 never estimates future opportunity loss from a short history. A known displaced order or a separately validated statistical model may provide an opportunity-cost input later.

## Next
- company setup UI
- order input UI
- before/after dashboard
- break-even order price
- resource bottleneck ranking
- historical order module only after data sufficiency rules are defined
