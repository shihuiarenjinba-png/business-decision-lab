import {classifyDecisionCosts} from './costs.js';

function finite(name, value, {min = -Infinity, max = Infinity} = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${name} must be a finite number between ${min} and ${max}`);
  }
  return n;
}

function optionalFinite(name, value, options) {
  if (value === undefined || value === null || value === '') return null;
  return finite(name, value, options);
}

function fixedCostStructure(profile = {}) {
  const detailedKeys = ['fixedLaborCost', 'depreciation', 'occupancyCost', 'otherFixedOperatingCosts'];
  const detailed = detailedKeys.some((key) => profile[key] !== undefined && profile[key] !== null && profile[key] !== '');
  if (!detailed) {
    const total = finite('fixedOperatingCosts', profile.fixedOperatingCosts ?? 0, {min: 0});
    return {
      source: 'aggregate',
      fixedLaborCost: null,
      depreciation: null,
      occupancyCost: null,
      otherFixedOperatingCosts: null,
      total
    };
  }
  const fixedLaborCost = finite('fixedLaborCost', profile.fixedLaborCost ?? 0, {min: 0});
  const depreciation = finite('depreciation', profile.depreciation ?? 0, {min: 0});
  const occupancyCost = finite('occupancyCost', profile.occupancyCost ?? 0, {min: 0});
  const otherFixedOperatingCosts = finite('otherFixedOperatingCosts', profile.otherFixedOperatingCosts ?? 0, {min: 0});
  return {
    source: 'detailed',
    fixedLaborCost,
    depreciation,
    occupancyCost,
    otherFixedOperatingCosts,
    total: fixedLaborCost + depreciation + occupancyCost + otherFixedOperatingCosts
  };
}

function laborCapacity(profile = {}) {
  const explicit = optionalFinite('laborHoursAvailable', profile.laborHoursAvailable, {min: 0});
  const employeeCount = optionalFinite('employeeCount', profile.employeeCount, {min: 0});
  const paidHoursPerEmployee = optionalFinite('paidHoursPerEmployee', profile.paidHoursPerEmployee, {min: 0});
  const available = explicit ?? (
    employeeCount !== null && paidHoursPerEmployee !== null
      ? employeeCount * paidHoursPerEmployee
      : 0
  );
  return {available, employeeCount, paidHoursPerEmployee, source: explicit !== null ? 'explicit' : 'derived'};
}

export function companyBaseline(profile) {
  const revenue = finite('monthlyRevenue', profile.monthlyRevenue, {min: 0});
  const variableCosts = finite('variableCosts', profile.variableCosts ?? 0, {min: 0});
  const fixed = fixedCostStructure(profile);
  const labor = laborCapacity(profile);
  const contribution = revenue - variableCosts;
  const operatingProfit = contribution - fixed.total;

  const nonLaborFixed = fixed.source === 'detailed'
    ? fixed.depreciation + fixed.occupancyCost + fixed.otherFixedOperatingCosts
    : null;
  const residualBeforeFixedLabor = nonLaborFixed === null ? null : contribution - nonLaborFixed;

  return {
    revenue,
    variableCosts,
    fixedOperatingCosts: fixed.total,
    fixedCostStructure: fixed,
    contribution,
    operatingProfit,
    contributionMarginRate: revenue > 0 ? contribution / revenue : null,
    fixedCostCoverage: fixed.total > 0 ? contribution / fixed.total : null,
    laborHoursAvailable: labor.available,
    laborCapacitySource: labor.source,
    employeeCount: labor.employeeCount,
    paidHoursPerEmployee: labor.paidHoursPerEmployee,
    contributionPerAvailableLaborHour: labor.available > 0 ? contribution / labor.available : null,
    operatingProfitPerAvailableLaborHour: labor.available > 0 ? operatingProfit / labor.available : null,
    residualBeforeFixedLabor,
    residualBeforeFixedLaborPerAvailableHour: labor.available > 0 && residualBeforeFixedLabor !== null
      ? residualBeforeFixedLabor / labor.available
      : null,
    metricNotes: [
      'Revenue and contribution are enterprise-wide outputs; they are not attributed entirely to employees.',
      'Residual-before-fixed-labor subtracts variable costs and explicit non-labor fixed costs before dividing by labor capacity. It is a productivity proxy, not a causal estimate of employee value.',
      'Special/extraordinary losses are outside this operating model unless entered as a decision-specific relevant cost.'
    ]
  };
}

function normalizeResources(resources = []) {
  return resources.map((r, index) => {
    const id = String(r.id ?? `resource-${index + 1}`);
    const capacityHours = finite(`${id}.capacityHours`, r.capacityHours, {min: 0});
    const usedHours = finite(`${id}.usedHours`, r.usedHours ?? 0, {min: 0});
    if (usedHours > capacityHours) throw new Error(`${id}.usedHours cannot exceed capacityHours`);
    return {id, name: String(r.name ?? id), type: String(r.type ?? 'other'), capacityHours, usedHours};
  });
}

function relevantOrderCosts(order = {}) {
  const classifiedAdditional = classifyDecisionCosts(order.additionalCostItems ?? []);
  const costs = {
    materials: finite('order.materials', order.materials ?? 0, {min: 0}),
    external: finite('order.external', order.external ?? 0, {min: 0}),
    incrementalLabor: finite('order.incrementalLabor', order.incrementalLabor ?? 0, {min: 0}),
    incrementalEquipment: finite('order.incrementalEquipment', order.incrementalEquipment ?? 0, {min: 0}),
    other: finite('order.otherRelevantCost', order.otherRelevantCost ?? 0, {min: 0}),
    stepFixed: finite('order.stepFixedCost', order.stepFixedCost ?? 0, {min: 0}),
    knownOpportunityCost: finite('order.knownOpportunityCost', order.knownOpportunityCost ?? 0, {min: 0}),
    additionalClassified: classifiedAdditional.relevantTotal
  };
  return {
    costs,
    total: Object.values(costs).reduce((a, b) => a + b, 0),
    additionalCostClassification: classifiedAdditional
  };
}

export function evaluateOrder(profile, order) {
  const baseline = companyBaseline(profile);
  const revenue = finite('order.revenue', order.revenue, {min: 0});
  const units = optionalFinite('order.units', order.units, {min: 0});
  const {costs: relevantCosts, total: relevantCostTotal, additionalCostClassification} = relevantOrderCosts(order);
  const incrementalContribution = revenue - relevantCostTotal;

  const resources = normalizeResources(profile.resources);
  const required = order.resourceHours ?? {};
  const resourceImpacts = resources.map((r) => {
    const addedHours = finite(`order.resourceHours.${r.id}`, required[r.id] ?? 0, {min: 0});
    const beforeUtilization = r.capacityHours > 0 ? r.usedHours / r.capacityHours : null;
    const afterHours = r.usedHours + addedHours;
    const afterUtilization = r.capacityHours > 0 ? afterHours / r.capacityHours : null;
    const remainingHoursAfter = r.capacityHours - afterHours;
    return {
      ...r,
      addedHours,
      afterHours,
      beforeUtilization,
      afterUtilization,
      remainingHoursAfter,
      capacityBreach: afterHours > r.capacityHours,
      incrementalContributionPerAddedHour: addedHours > 0 ? incrementalContribution / addedHours : null
    };
  });

  const bottlenecks = [...resourceImpacts]
    .filter((r) => r.afterUtilization !== null)
    .sort((a, b) => b.afterUtilization - a.afterUtilization);

  const after = {
    revenue: baseline.revenue + revenue,
    contribution: baseline.contribution + revenue - (relevantCostTotal - relevantCosts.knownOpportunityCost),
    operatingProfit: baseline.operatingProfit + incrementalContribution
  };

  const feasibleWithCurrentCapacity = resourceImpacts.every((r) => !r.capacityBreach);
  const decisionSignal = incrementalContribution < 0
    ? 'NEGATIVE_INCREMENTAL_VALUE'
    : !feasibleWithCurrentCapacity
      ? 'CAPACITY_HOLD'
      : incrementalContribution === 0
        ? 'BREAK_EVEN'
        : 'POSITIVE_INCREMENTAL_VALUE';

  return {
    baseline,
    order: {
      revenue,
      units,
      relevantCosts,
      relevantCostTotal,
      incrementalContribution,
      incrementalMarginRate: revenue > 0 ? incrementalContribution / revenue : null,
      breakEvenRevenue: relevantCostTotal,
      breakEvenUnitPrice: units && units > 0 ? relevantCostTotal / units : null,
      additionalCostClassification
    },
    after,
    operatingProfitChange: incrementalContribution,
    operatingProfitChangeRate: baseline.operatingProfit > 0
      ? incrementalContribution / baseline.operatingProfit
      : null,
    resources: resourceImpacts,
    bottlenecks,
    feasibleWithCurrentCapacity,
    decisionSignal,
    recommendedAction: decisionSignal === 'POSITIVE_INCREMENTAL_VALUE'
      ? 'ACCEPT'
      : decisionSignal === 'NEGATIVE_INCREMENTAL_VALUE'
        ? 'REJECT'
        : 'HOLD',
    assumptions: [
      'Unchanged fixed operating costs remain in company-level profitability and are not allocated again to this incremental accept/reject decision.',
      'Step-fixed costs are included only when the order actually triggers a new commitment such as an added shift, lease, machine, or warehouse.',
      'Opportunity cost is included only when supplied as a known or separately validated value; this engine does not fabricate future orders.',
      'Capacity is a deterministic planning constraint. A positive incremental contribution does not override a capacity breach.',
      'Cost attribution labels such as labor/equipment/materials describe where a cost arises; relevance is determined separately by whether the decision changes or avoids that cost.'
    ]
  };
}

export function rankOrdersByBottleneck(profile, orders = []) {
  if (!Array.isArray(orders)) throw new Error('orders must be an array');
  const evaluated = orders.map((order, index) => {
    const result = evaluateOrder(profile, order);
    const positiveHours = result.resources.filter((r) => r.addedHours > 0);
    const tightest = positiveHours
      .slice()
      .sort((a, b) => (b.afterUtilization ?? -Infinity) - (a.afterUtilization ?? -Infinity))[0] ?? null;
    const contributionPerTightestHour = tightest && tightest.addedHours > 0
      ? result.order.incrementalContribution / tightest.addedHours
      : null;
    return {
      id: String(order.id ?? `order-${index + 1}`),
      name: String(order.name ?? order.id ?? `Order ${index + 1}`),
      result,
      tightestResource: tightest?.id ?? null,
      contributionPerTightestHour
    };
  });

  return evaluated.sort((a, b) => {
    if (a.result.recommendedAction !== b.result.recommendedAction) {
      const priority = {ACCEPT: 0, HOLD: 1, REJECT: 2};
      return priority[a.result.recommendedAction] - priority[b.result.recommendedAction];
    }
    return (b.contributionPerTightestHour ?? b.result.order.incrementalContribution)
      - (a.contributionPerTightestHour ?? a.result.order.incrementalContribution);
  });
}
