import assert from 'node:assert/strict';
import test from 'node:test';
import {datasetFromCsv, datasetFromJson, datasetToCsv, datasetToJson} from '../src/io.js';

const dataset = {
  company: {
    monthlyRevenue: 5_000_000, variableCosts: 3_000_000, fixedLaborCost: 900_000,
    depreciation: 250_000, occupancyCost: 200_000, otherFixedOperatingCosts: 150_000,
    employeeCount: 7, paidHoursPerEmployee: 160, laborHoursAvailable: 1120,
    resources: [
      {id: 'labor', name: '労働', type: 'labor', capacityHours: 1120, usedHours: 780},
      {id: 'machine', name: '設備', type: 'equipment', capacityHours: 180, usedHours: 150}
    ]
  },
  orders: [{
    id: 'quoted', name: 'Order "A", Tokyo', revenue: 1_000_000, units: 100,
    materials: 500_000, incrementalLabor: 100_000, incrementalEquipment: 0,
    external: 0, otherRelevantCost: 0, stepFixedCost: 0, knownOpportunityCost: 0,
    resourceHours: {labor: 60, machine: 10},
    additionalCostItems: [{name: 'overtime, night', amount: 80_000, behavior: 'variable', attribution: 'labor', changesWithDecision: true}]
  }]
};

test('JSON export/import preserves company and candidate orders', () => {
  const restored = datasetFromJson(datasetToJson(dataset));
  assert.equal(restored.company.monthlyRevenue, 5_000_000);
  assert.equal(restored.orders[0].name, 'Order "A", Tokyo');
  assert.equal(restored.orders[0].additionalCostItems[0].amount, 80_000);
});

test('CSV export/import handles quoted fields and nested additional costs', () => {
  const csv = datasetToCsv(dataset);
  const restored = datasetFromCsv(csv);
  assert.equal(restored.company.resources.find((resource) => resource.id === 'machine').usedHours, 150);
  assert.equal(restored.orders[0].name, 'Order "A", Tokyo');
  assert.equal(restored.orders[0].additionalCostItems[0].name, 'overtime, night');
  assert.equal(restored.orders[0].resourceHours.labor, 60);
});

test('legacy result JSON with profile and order remains importable', () => {
  const restored = datasetFromJson(JSON.stringify({profile: dataset.company, order: dataset.orders[0]}));
  assert.equal(restored.orders.length, 1);
  assert.equal(restored.orders[0].id, 'quoted');
});

test('CSV import fails closed without a company row', () => {
  assert.throws(() => datasetFromCsv('type,id\r\norder,a'), /type=company/);
});

test('JSON import fails closed without company/profile data', () => {
  assert.throws(() => datasetFromJson('{"orders":[]}'), /company\/profile/);
});
