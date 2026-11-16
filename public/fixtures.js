const baseCompany = {
  monthlyRevenue: 5_000_000,
  variableCosts: 3_000_000,
  fixedLaborCost: 900_000,
  depreciation: 250_000,
  occupancyCost: 200_000,
  otherFixedOperatingCosts: 150_000,
  employeeCount: 7,
  paidHoursPerEmployee: 160,
  laborHoursAvailable: 1_120,
  resources: [
    {id: 'labor', name: '労働', type: 'labor', capacityHours: 1_120, usedHours: 780},
    {id: 'machine', name: '設備', type: 'equipment', capacityHours: 180, usedHours: 150}
  ]
};

const baseOrder = {
  id: 'order-a',
  name: 'Order A',
  revenue: 1_000_000,
  units: 100,
  materials: 500_000,
  incrementalLabor: 100_000,
  incrementalEquipment: 0,
  external: 0,
  otherRelevantCost: 0,
  stepFixedCost: 0,
  knownOpportunityCost: 0,
  resourceHours: {labor: 60, machine: 10},
  additionalCostItems: []
};

export const FIXTURES = {
  manufacturing: {
    label: '製造業 / Manufacturing',
    description: '材料・労働・設備の共同利用と、通常固定費、Step-fixed、capacity breachを比較します。',
    company: structuredClone(baseCompany),
    orders: [
      structuredClone(baseOrder),
      {...structuredClone(baseOrder), id: 'order-b', name: 'Order B', revenue: 780_000, units: 60, materials: 310_000, incrementalLabor: 70_000, resourceHours: {labor: 42, machine: 20}},
      {...structuredClone(baseOrder), id: 'step-fixed', name: 'Step-fixed Cost発生', revenue: 1_300_000, materials: 520_000, incrementalLabor: 120_000, stepFixedCost: 250_000, resourceHours: {labor: 90, machine: 18}},
      {...structuredClone(baseOrder), id: 'capacity-breach', name: 'Capacity breach', revenue: 900_000, materials: 330_000, incrementalLabor: 75_000, resourceHours: {labor: 80, machine: 40}}
    ]
  },
  service: {
    label: 'サービス業 / Service',
    description: '設備依存が小さいサービス案件で、外注・追加労働と既知の機会費用を評価します。',
    company: {
      monthlyRevenue: 2_400_000, variableCosts: 420_000, fixedLaborCost: 1_100_000,
      depreciation: 40_000, occupancyCost: 180_000, otherFixedOperatingCosts: 210_000,
      employeeCount: 6, paidHoursPerEmployee: 150, laborHoursAvailable: 900,
      resources: [
        {id: 'labor', name: '労働', type: 'labor', capacityHours: 900, usedHours: 720},
        {id: 'machine', name: '設備', type: 'equipment', capacityHours: 80, usedHours: 20}
      ]
    },
    orders: [{
      id: 'service-a', name: 'Service A', revenue: 620_000, units: 1, materials: 0,
      incrementalLabor: 180_000, incrementalEquipment: 0, external: 90_000,
      otherRelevantCost: 20_000, stepFixedCost: 0, knownOpportunityCost: 60_000,
      resourceHours: {labor: 110, machine: 4}, additionalCostItems: []
    }]
  },
  capacity_breach: {
    label: 'Capacity breach',
    description: '増分利益は正でも、設備capacityを超えるためHOLDになるfixtureです。',
    company: structuredClone(baseCompany),
    orders: [{...structuredClone(baseOrder), id: 'capacity-breach', name: 'Capacity breach', resourceHours: {labor: 60, machine: 40}}]
  },
  avoidable_fixed: {
    label: '回避可能固定費 / Avoidable fixed',
    description: '意思決定で増減し、回避可能な追加倉庫費だけをRelevant Costに含めます。',
    company: structuredClone(baseCompany),
    orders: [{...structuredClone(baseOrder), id: 'avoidable-fixed', name: 'Avoidable fixed', additionalCostItems: [
      {name: '追加倉庫賃料', amount: 120_000, behavior: 'fixed', attribution: 'occupancy', changesWithDecision: true, avoidable: true, triggered: false, known: true, enterpriseOperating: true}
    ]}]
  },
  allocated_overhead: {
    label: '配賦共通費 / Allocated overhead',
    description: '意思決定で変わらない本社配賦費を増分判断から除外します。',
    company: structuredClone(baseCompany),
    orders: [{...structuredClone(baseOrder), id: 'allocated-overhead', name: 'Allocated overhead', additionalCostItems: [
      {name: '本社共通費配賦', amount: 90_000, behavior: 'allocated', attribution: 'shared', changesWithDecision: false, avoidable: false, triggered: false, known: true, enterpriseOperating: true}
    ]}]
  },
  sunk_cost: {
    label: '埋没費用 / Sunk cost',
    description: '過去に支払済みの設計費を現在の受注判断から除外します。',
    company: structuredClone(baseCompany),
    orders: [{...structuredClone(baseOrder), id: 'sunk-cost', name: 'Sunk cost', additionalCostItems: [
      {name: '支払済み設計費', amount: 300_000, behavior: 'sunk', attribution: 'other', changesWithDecision: false, avoidable: false, triggered: false, known: true, enterpriseOperating: false}
    ]}]
  },
  known_opportunity: {
    label: '既知の機会費用 / Known opportunity',
    description: '確定済み代替案件の貢献利益のみを既知の機会費用として含めます。',
    company: structuredClone(baseCompany),
    orders: [{...structuredClone(baseOrder), id: 'known-opportunity', name: 'Known opportunity', additionalCostItems: [
      {name: '断る確定案件の貢献利益', amount: 180_000, behavior: 'opportunity', attribution: 'shared', changesWithDecision: false, avoidable: false, triggered: false, known: true, enterpriseOperating: false},
      {name: '仮想的な将来案件', amount: 200_000, behavior: 'opportunity', attribution: 'unknown', changesWithDecision: false, avoidable: false, triggered: false, known: false, enterpriseOperating: false}
    ]}]
  }
};

export function cloneFixture(key) {
  const fixture = FIXTURES[key];
  if (!fixture) throw new Error(`Unknown fixture: ${key}`);
  return structuredClone(fixture);
}
