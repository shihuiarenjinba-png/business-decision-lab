function finite(name, value, {min = -Infinity} = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) throw new Error(`${name} must be a finite number >= ${min}`);
  return n;
}

export function companyBaseline(profile) {
  const revenue = finite('monthlyRevenue', profile.monthlyRevenue, {min: 0});
  const variableCosts = finite('variableCosts', profile.variableCosts ?? 0, {min: 0});
  const fixedOperatingCosts = finite('fixedOperatingCosts', profile.fixedOperatingCosts ?? 0, {min: 0});
  const laborHoursAvailable = finite('laborHoursAvailable', profile.laborHoursAvailable, {min: 0});
  const contribution = revenue - variableCosts;
  const operatingProfit = contribution - fixedOperatingCosts;
  return {
    revenue,
    variableCosts,
    fixedOperatingCosts,
    contribution,
    operatingProfit,
    contributionMarginRate: revenue > 0 ? contribution / revenue : null,
    fixedCostCoverage: fixedOperatingCosts > 0 ? contribution / fixedOperatingCosts : null,
    contributionPerAvailableLaborHour: laborHoursAvailable > 0 ? contribution / laborHoursAvailable : null,
    laborHoursAvailable
  };
}

function normalizeResources(resources = []) {
  return resources.map((r, index) => {
    const id = String(r.id ?? `resource-${index + 1}`);
    const capacityHours = finite(`${id}.capacityHours`, r.capacityHours, {min: 0});
    const usedHours = finite(`${id}.usedHours`, r.usedHours ?? 0, {min: 0});
    if (usedHours > capacityHours) throw new Error(`${id}.usedHours cannot exceed capacityHours`);
    return {id, type: String(r.type ?? 'other'), capacityHours, usedHours};
  });
}

export function evaluateOrder(profile, order) {
  const baseline = companyBaseline(profile);
  const revenue = finite('order.revenue', order.revenue, {min: 0});
  const relevantCosts = {
    materials: finite('order.materials', order.materials ?? 0, {min: 0}),
    external: finite('order.external', order.external ?? 0, {min: 0}),
    incrementalLabor: finite('order.incrementalLabor', order.incrementalLabor ?? 0, {min: 0}),
    incrementalEquipment: finite('order.incrementalEquipment', order.incrementalEquipment ?? 0, {min: 0}),
    other: finite('order.otherRelevantCost', order.otherRelevantCost ?? 0, {min: 0}),
    stepFixed: finite('order.stepFixedCost', order.stepFixedCost ?? 0, {min: 0}),
    knownOpportunityCost: finite('order.knownOpportunityCost', order.knownOpportunityCost ?? 0, {min: 0})
  };
  const relevantCostTotal = Object.values(relevantCosts).reduce((a, b) => a + b, 0);
  const incrementalContribution = revenue - relevantCostTotal;

  const resources = normalizeResources(profile.resources);
  const required = order.resourceHours ?? {};
  const resourceImpacts = resources.map((r) => {
    const addedHours = finite(`order.resourceHours.${r.id}`, required[r.id] ?? 0, {min: 0});
    const beforeUtilization = r.capacityHours > 0 ? r.usedHours / r.capacityHours : null;
    const afterHours = r.usedHours + addedHours;
    const afterUtilization = r.capacityHours > 0 ? afterHours / r.capacityHours : null;
    return {
      ...r,
      addedHours,
      afterHours,
      beforeUtilization,
      afterUtilization,
      capacityBreach: afterHours > r.capacityHours
    };
  });

  const after = {
    revenue: baseline.revenue + revenue,
    contribution: baseline.contribution + revenue - (relevantCostTotal - relevantCosts.knownOpportunityCost),
    operatingProfit: baseline.operatingProfit + incrementalContribution
  };

  return {
    baseline,
    order: {revenue, relevantCosts, relevantCostTotal, incrementalContribution},
    after,
    operatingProfitChange: after.operatingProfit - baseline.operatingProfit,
    operatingProfitChangeRate: baseline.operatingProfit > 0
      ? (after.operatingProfit - baseline.operatingProfit) / baseline.operatingProfit
      : null,
    resources: resourceImpacts,
    feasibleWithCurrentCapacity: resourceImpacts.every(r => !r.capacityBreach),
    decisionSignal: incrementalContribution < 0
      ? 'NEGATIVE_INCREMENTAL_VALUE'
      : resourceImpacts.some(r => r.capacityBreach)
        ? 'CAPACITY_HOLD'
        : 'POSITIVE_INCREMENTAL_VALUE',
    assumptions: [
      'Unchanged fixed operating costs are not allocated to the incremental accept/reject decision.',
      'Step-fixed costs are included only when the order actually triggers them.',
      'Opportunity cost is included only when supplied as a known or separately estimated value; this engine does not fabricate future orders.'
    ]
  };
}
