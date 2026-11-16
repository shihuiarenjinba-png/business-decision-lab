import assert from 'node:assert/strict';
import test from 'node:test';
import {evaluateOrder, rankOrdersByBottleneck} from '../src/decision.js';
import {cloneFixture, FIXTURES} from '../src/fixtures.js';

test('required acceptance fixtures are available', () => {
  assert.deepEqual(Object.keys(FIXTURES), [
    'manufacturing', 'service', 'capacity_breach', 'avoidable_fixed',
    'allocated_overhead', 'sunk_cost', 'known_opportunity'
  ]);
});

test('manufacturing fixture compares Order A/B, step-fixed and capacity breach scenarios', () => {
  const fixture = cloneFixture('manufacturing');
  const ranked = rankOrdersByBottleneck(fixture.company, fixture.orders);
  assert.equal(ranked.length, 4);
  const step = ranked.find((entry) => entry.id === 'step-fixed').result;
  const breach = ranked.find((entry) => entry.id === 'capacity-breach').result;
  assert.equal(step.order.relevantCosts.stepFixed, 250_000);
  assert.equal(breach.recommendedAction, 'HOLD');
  assert.equal(breach.feasibleWithCurrentCapacity, false);
});

test('service fixture remains a feasible positive incremental decision', () => {
  const fixture = cloneFixture('service');
  const result = evaluateOrder(fixture.company, fixture.orders[0]);
  assert.equal(result.recommendedAction, 'ACCEPT');
  assert.equal(result.order.knownOpportunityCost, undefined);
  assert.equal(result.order.relevantCosts.knownOpportunityCost, 60_000);
});

test('avoidable fixed fixture includes a changed and avoidable lease', () => {
  const fixture = cloneFixture('avoidable_fixed');
  const result = evaluateOrder(fixture.company, fixture.orders[0]);
  const item = result.order.additionalCostClassification.items[0];
  assert.equal(item.relevantToIncrementalDecision, true);
  assert.equal(item.reason, 'avoidable_fixed_changes_with_decision');
});

test('allocated overhead and sunk fixtures show explicit exclusions', () => {
  for (const [key, reason] of [['allocated_overhead', 'allocated_unavoidable_or_unchanged'], ['sunk_cost', 'sunk_cost']]) {
    const fixture = cloneFixture(key);
    const result = evaluateOrder(fixture.company, fixture.orders[0]);
    const item = result.order.additionalCostClassification.items[0];
    assert.equal(item.relevantToIncrementalDecision, false);
    assert.equal(item.reason, reason);
  }
});

test('known opportunity fixture includes only the confirmed alternative', () => {
  const fixture = cloneFixture('known_opportunity');
  const result = evaluateOrder(fixture.company, fixture.orders[0]);
  const classification = result.order.additionalCostClassification;
  assert.equal(classification.relevantTotal, 180_000);
  assert.equal(classification.excludedTotal, 200_000);
  assert.equal(classification.items[1].reason, 'unknown_opportunity_cost');
});
