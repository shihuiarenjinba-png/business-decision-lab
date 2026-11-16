const CSV_COLUMNS = [
  'type', 'id', 'name', 'monthlyRevenue', 'variableCosts', 'fixedLaborCost',
  'depreciation', 'occupancyCost', 'otherFixedOperatingCosts', 'employeeCount',
  'paidHoursPerEmployee', 'laborCapacity', 'laborUsed', 'machineCapacity',
  'machineUsed', 'revenue', 'units', 'materials', 'incrementalLabor',
  'incrementalEquipment', 'external', 'otherRelevantCost', 'stepFixedCost',
  'knownOpportunityCost', 'laborHours', 'machineHours', 'additionalCostItems'
];

function finiteOrZero(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function csvEscape(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('CSVの引用符が閉じられていません。');
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value !== ''));
}

export function normalizeDataset(input = {}) {
  const company = input.company ?? input.profile ?? {};
  const legacyOrder = input.order ? [input.order] : [];
  const orders = Array.isArray(input.orders) ? input.orders : legacyOrder;
  return {
    schemaVersion: 1,
    company,
    orders,
    exportedAt: input.exportedAt ?? input.generatedAt ?? null
  };
}

export function datasetToJson(dataset) {
  const normalized = normalizeDataset(dataset);
  return JSON.stringify({...normalized, exportedAt: new Date().toISOString()}, null, 2);
}

export function datasetFromJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(String(text));
  } catch (error) {
    throw new Error(`JSONを読み込めません: ${error.message}`);
  }
  if (!parsed || typeof parsed !== 'object' || (!parsed.company && !parsed.profile)) {
    throw new Error('JSONにcompany/profileがありません。');
  }
  const normalized = normalizeDataset(parsed);
  return normalized;
}

export function datasetToCsv(dataset) {
  const {company, orders} = normalizeDataset(dataset);
  const labor = company.resources?.find((resource) => resource.id === 'labor') ?? {};
  const machine = company.resources?.find((resource) => resource.id === 'machine') ?? {};
  const rows = [{
    type: 'company',
    id: 'company',
    name: 'Current company',
    monthlyRevenue: company.monthlyRevenue,
    variableCosts: company.variableCosts,
    fixedLaborCost: company.fixedLaborCost,
    depreciation: company.depreciation,
    occupancyCost: company.occupancyCost,
    otherFixedOperatingCosts: company.otherFixedOperatingCosts,
    employeeCount: company.employeeCount,
    paidHoursPerEmployee: company.paidHoursPerEmployee,
    laborCapacity: labor.capacityHours ?? company.laborHoursAvailable,
    laborUsed: labor.usedHours,
    machineCapacity: machine.capacityHours,
    machineUsed: machine.usedHours
  }];
  orders.forEach((order, index) => rows.push({
    type: 'order',
    id: order.id ?? `order-${index + 1}`,
    name: order.name ?? `Order ${index + 1}`,
    revenue: order.revenue,
    units: order.units,
    materials: order.materials,
    incrementalLabor: order.incrementalLabor,
    incrementalEquipment: order.incrementalEquipment,
    external: order.external,
    otherRelevantCost: order.otherRelevantCost,
    stepFixedCost: order.stepFixedCost,
    knownOpportunityCost: order.knownOpportunityCost,
    laborHours: order.resourceHours?.labor,
    machineHours: order.resourceHours?.machine,
    additionalCostItems: JSON.stringify(order.additionalCostItems ?? [])
  }));
  return [
    CSV_COLUMNS.join(','),
    ...rows.map((row) => CSV_COLUMNS.map((column) => csvEscape(row[column])).join(','))
  ].join('\r\n');
}

export function datasetFromCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) throw new Error('CSVにヘッダーとデータ行が必要です。');
  const headers = rows[0];
  const records = rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
  const companyRecord = records.find((record) => record.type === 'company');
  if (!companyRecord) throw new Error('CSVにtype=companyの行がありません。');
  const company = {
    monthlyRevenue: finiteOrZero(companyRecord.monthlyRevenue),
    variableCosts: finiteOrZero(companyRecord.variableCosts),
    fixedLaborCost: finiteOrZero(companyRecord.fixedLaborCost),
    depreciation: finiteOrZero(companyRecord.depreciation),
    occupancyCost: finiteOrZero(companyRecord.occupancyCost),
    otherFixedOperatingCosts: finiteOrZero(companyRecord.otherFixedOperatingCosts),
    employeeCount: finiteOrZero(companyRecord.employeeCount),
    paidHoursPerEmployee: finiteOrZero(companyRecord.paidHoursPerEmployee),
    laborHoursAvailable: finiteOrZero(companyRecord.laborCapacity),
    resources: [
      {id: 'labor', name: '労働', type: 'labor', capacityHours: finiteOrZero(companyRecord.laborCapacity), usedHours: finiteOrZero(companyRecord.laborUsed)},
      {id: 'machine', name: '設備', type: 'equipment', capacityHours: finiteOrZero(companyRecord.machineCapacity), usedHours: finiteOrZero(companyRecord.machineUsed)}
    ]
  };
  const orders = records.filter((record) => record.type === 'order').map((record, index) => {
    let additionalCostItems = [];
    if (record.additionalCostItems) {
      try {
        additionalCostItems = JSON.parse(record.additionalCostItems);
      } catch {
        throw new Error(`${record.name || `Order ${index + 1}`} のadditionalCostItemsが正しいJSONではありません。`);
      }
    }
    return {
      id: record.id || `order-${index + 1}`,
      name: record.name || `Order ${index + 1}`,
      revenue: finiteOrZero(record.revenue),
      units: finiteOrZero(record.units),
      materials: finiteOrZero(record.materials),
      incrementalLabor: finiteOrZero(record.incrementalLabor),
      incrementalEquipment: finiteOrZero(record.incrementalEquipment),
      external: finiteOrZero(record.external),
      otherRelevantCost: finiteOrZero(record.otherRelevantCost),
      stepFixedCost: finiteOrZero(record.stepFixedCost),
      knownOpportunityCost: finiteOrZero(record.knownOpportunityCost),
      resourceHours: {labor: finiteOrZero(record.laborHours), machine: finiteOrZero(record.machineHours)},
      additionalCostItems
    };
  });
  return {schemaVersion: 1, company, orders, exportedAt: null};
}

export const DATASET_CSV_COLUMNS = [...CSV_COLUMNS];
