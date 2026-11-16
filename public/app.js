import {companyBaseline, evaluateOrder, rankOrdersByBottleneck} from './decision.js';
import {classifyDecisionCosts, COST_ATTRIBUTIONS, COST_BEHAVIORS} from './costs.js';
import {datasetFromCsv, datasetFromJson, datasetToCsv, datasetToJson} from './io.js';
import {cloneFixture, FIXTURES} from './fixtures.js';

const $ = (id) => document.getElementById(id);
const clone = (value) => structuredClone(value);
const yen = (value) => value === null || value === undefined ? '—' : `${Math.round(value).toLocaleString('ja-JP')}円`;
const pct = (value) => value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
const hours = (value) => value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}h`;
const num = (id) => Number($(id).value || 0);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const newId = () => globalThis.crypto?.randomUUID?.() ?? `order-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const reasonLabels = {
  variable_changes_with_decision: '意思決定で増減する変動費',
  variable_but_no_incremental_change: '変動費だが、この意思決定では増減しない',
  avoidable_fixed_changes_with_decision: '意思決定で変化し、回避可能な固定費',
  unchanged_or_unavoidable_fixed: '変化しない、または回避不能な固定費',
  triggered_step_fixed: '閾値を超えて実際に発生するStep-fixed Cost',
  step_fixed_not_triggered: 'Step-fixed Costの発生条件を満たしていない',
  known_opportunity_cost: '既知の代替案を失う機会費用',
  unknown_opportunity_cost: '未知の将来案件は金額化しない',
  sunk_cost: '過去に発生済みのSunk Cost',
  allocated_but_economically_avoidable: '配賦費だが、基礎費用が実際に変化し回避可能',
  allocated_unavoidable_or_unchanged: '会計配賦のみで、基礎費用は変化・回避しない',
  excluded_by_default: '増分Relevant Costの条件を満たさない'
};

const behaviorLabels = {
  variable: 'Variable', fixed: 'Fixed', step_fixed: 'Step-fixed', sunk: 'Sunk',
  allocated: 'Allocated', opportunity: 'Opportunity'
};

let candidateOrders = [];
let costItems = [];
let selectedOrderId = null;
let lastResult = null;

function profile() {
  return {
    monthlyRevenue: num('monthlyRevenue'),
    variableCosts: num('variableCosts'),
    fixedLaborCost: num('fixedLaborCost'),
    depreciation: num('depreciation'),
    occupancyCost: num('occupancyCost'),
    otherFixedOperatingCosts: num('otherFixedOperatingCosts'),
    employeeCount: num('employeeCount'),
    paidHoursPerEmployee: num('paidHoursPerEmployee'),
    laborHoursAvailable: num('laborCapacity'),
    resources: [
      {id: 'labor', name: '労働', type: 'labor', capacityHours: num('laborCapacity'), usedHours: num('laborUsed')},
      {id: 'machine', name: '設備', type: 'equipment', capacityHours: num('machineCapacity'), usedHours: num('machineUsed')}
    ]
  };
}

function currentOrder() {
  return {
    id: selectedOrderId ?? newId(),
    name: $('orderName').value.trim() || 'Untitled order',
    revenue: num('orderRevenue'),
    units: num('orderUnits'),
    materials: num('materials'),
    incrementalLabor: num('incrementalLabor'),
    incrementalEquipment: num('incrementalEquipment'),
    external: num('external'),
    otherRelevantCost: num('otherRelevantCost'),
    stepFixedCost: num('stepFixedCost'),
    knownOpportunityCost: num('knownOpportunityCost'),
    resourceHours: {labor: num('orderLaborHours'), machine: num('orderMachineHours')},
    additionalCostItems: clone(costItems)
  };
}

function blankOrder() {
  return {
    id: null, name: 'New Order', revenue: 0, units: 1, materials: 0,
    incrementalLabor: 0, incrementalEquipment: 0, external: 0,
    otherRelevantCost: 0, stepFixedCost: 0, knownOpportunityCost: 0,
    resourceHours: {labor: 0, machine: 0}, additionalCostItems: []
  };
}

function setValues(values) {
  Object.entries(values).forEach(([id, value]) => {
    if ($(id) && value !== undefined && value !== null) $(id).value = value;
  });
}

function applyCompany(company) {
  const labor = company.resources?.find((resource) => resource.id === 'labor') ?? {};
  const machine = company.resources?.find((resource) => resource.id === 'machine') ?? {};
  setValues({
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
  });
}

function applyOrder(order) {
  selectedOrderId = order.id ?? null;
  setValues({
    orderName: order.name,
    orderRevenue: order.revenue,
    orderUnits: order.units,
    materials: order.materials,
    incrementalLabor: order.incrementalLabor,
    incrementalEquipment: order.incrementalEquipment,
    external: order.external,
    otherRelevantCost: order.otherRelevantCost,
    stepFixedCost: order.stepFixedCost,
    knownOpportunityCost: order.knownOpportunityCost,
    orderLaborHours: order.resourceHours?.labor,
    orderMachineHours: order.resourceHours?.machine
  });
  costItems = clone(order.additionalCostItems ?? []);
  renderCostEditor();
}

function card(label, value) {
  return `<div class="card"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
}

function renderBaseline() {
  const baseline = companyBaseline(profile());
  $('baselineCards').innerHTML = [
    card('限界利益 / Contribution', yen(baseline.contribution)),
    card('営業利益 / Operating profit', yen(baseline.operatingProfit)),
    card('限界利益率', pct(baseline.contributionMarginRate)),
    card('固定費カバー率', baseline.fixedCostCoverage === null ? '—' : `${baseline.fixedCostCoverage.toFixed(2)}x`),
    card('営業利益 / 労働capacity時', yen(baseline.operatingProfitPerAvailableLaborHour)),
    card('非労務固定費控除後残余 / 時', yen(baseline.residualBeforeFixedLaborPerAvailableHour))
  ].join('');
  return baseline;
}

function selectOptions(values, selected, labels = {}) {
  return values.map((value) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(labels[value] ?? value)}</option>`).join('');
}

function checkbox(index, field, checked, label) {
  return `<input type="checkbox" data-index="${index}" data-field="${field}" aria-label="${esc(label)}"${checked ? ' checked' : ''}>`;
}

function renderCostEditor() {
  if (costItems.length === 0) {
    $('costEditorRows').innerHTML = '<tr><td colspan="10" class="empty-row">追加費用はありません。必要な場合だけ追加してください。</td></tr>';
    return;
  }
  $('costEditorRows').innerHTML = costItems.map((item, index) => `
    <tr>
      <td><input data-index="${index}" data-field="name" value="${esc(item.name)}" aria-label="費用名"></td>
      <td><input data-index="${index}" data-field="amount" type="number" min="0" value="${esc(item.amount ?? 0)}" aria-label="金額"></td>
      <td><select data-index="${index}" data-field="behavior" aria-label="Behavior">${selectOptions(COST_BEHAVIORS, item.behavior, behaviorLabels)}</select></td>
      <td><select data-index="${index}" data-field="attribution" aria-label="Attribution">${selectOptions(COST_ATTRIBUTIONS, item.attribution)}</select></td>
      <td>${checkbox(index, 'changesWithDecision', item.changesWithDecision, '意思決定で変化')}</td>
      <td>${checkbox(index, 'avoidable', item.avoidable, '回避可能')}</td>
      <td>${checkbox(index, 'triggered', item.triggered, '発生条件を満たす')}</td>
      <td>${checkbox(index, 'known', item.known !== false, '金額が既知')}</td>
      <td>${checkbox(index, 'enterpriseOperating', item.enterpriseOperating !== false, '企業の営業費用')}</td>
      <td><button class="danger small-button" data-action="delete-cost" data-index="${index}" type="button" aria-label="費用を削除">削除</button></td>
    </tr>`).join('');
}

function renderCostAudit(classification) {
  if (classification.items.length === 0) {
    $('costAuditRows').innerHTML = '<tr><td colspan="7" class="empty-row">追加費用を入力すると、算入・除外理由がここに表示されます。</td></tr>';
    return;
  }
  $('costAuditRows').innerHTML = classification.items.map((item) => `
    <tr>
      <td>${esc(item.name)}</td><td>${esc(behaviorLabels[item.behavior] ?? item.behavior)}</td><td>${esc(item.attribution)}</td>
      <td>${esc(yen(item.amount))}</td><td>${esc(yen(item.incrementalAmount))}</td>
      <td><span class="status-pill ${item.relevantToIncrementalDecision ? 'include' : 'exclude'}">${item.relevantToIncrementalDecision ? 'INCLUDE' : 'EXCLUDE'}</span></td>
      <td>${esc(reasonLabels[item.reason] ?? item.reason)}</td>
    </tr>`).join('');
}

function bridgeRow(label, value, className = '') {
  return `<div class="bridge-row ${className}"><span>${esc(label)}</span><strong>${esc(yen(value))}</strong></div>`;
}

function renderBridge(baseline, result, classification) {
  const fixed = baseline.fixedCostStructure;
  const standardRelevant = result.order.relevantCostTotal - classification.relevantTotal;
  const baselineOperatingCost = baseline.variableCosts + baseline.fixedOperatingCosts;
  $('costBridge').innerHTML = `
    <div class="bridge-column">
      <h3>企業全体 / Enterprise</h3>
      ${bridgeRow('変動営業費', baseline.variableCosts)}
      ${bridgeRow('固定労務費', fixed.fixedLaborCost ?? 0)}
      ${bridgeRow('減価償却', fixed.depreciation ?? 0)}
      ${bridgeRow('占有費', fixed.occupancyCost ?? 0)}
      ${bridgeRow('その他固定営業費', fixed.otherFixedOperatingCosts ?? 0)}
      ${bridgeRow('既存の通常営業費用 合計', baselineOperatingCost, 'total')}
      ${bridgeRow('追加費用のうち企業ビュー対象', classification.enterpriseOperatingTotal)}
      <div class="bridge-row excluded"><span>重複計上の確認</span><strong>既存費用に含む場合は再加算しない</strong></div>
    </div>
    <div class="bridge-column">
      <h3>受注Relevant Cost / Incremental</h3>
      ${bridgeRow('標準の増分費用', standardRelevant)}
      ${bridgeRow('追加費用のうちRelevant', classification.relevantTotal)}
      ${bridgeRow('追加費用のうち除外（参考）', classification.excludedTotal, 'excluded')}
      ${bridgeRow('Relevant Cost 合計', result.order.relevantCostTotal, 'total')}
    </div>
    <div class="bridge-column">
      <h3>増分ブリッジ / Decision</h3>
      ${bridgeRow('受注売上', result.order.revenue)}
      ${bridgeRow('− Relevant Cost', -result.order.relevantCostTotal)}
      ${bridgeRow('増分利益', result.order.incrementalContribution, 'total')}
      ${bridgeRow('除外費用は再配賦しない', classification.excludedTotal, 'excluded')}
    </div>`;
}

function evaluateCurrent({silent = false} = {}) {
  try {
    const baseline = renderBaseline();
    const order = currentOrder();
    const result = evaluateOrder(profile(), order);
    const classification = classifyDecisionCosts(order.additionalCostItems);
    lastResult = result;
    const actionClass = result.recommendedAction.toLowerCase();
    const label = result.recommendedAction === 'ACCEPT' ? '受注候補' : result.recommendedAction === 'REJECT' ? '受注非推奨' : '保留 / capacity確認';
    $('decisionBanner').className = `decision ${actionClass}`;
    $('decisionBanner').textContent = `${label} — ${result.decisionSignal}`;
    $('orderCards').innerHTML = [
      card('増分利益', yen(result.order.incrementalContribution)),
      card('Relevant Cost', yen(result.order.relevantCostTotal)),
      card('除外した追加費用', yen(classification.excludedTotal)),
      card('損益分岐売上', yen(result.order.breakEvenRevenue)),
      card('損益分岐単価', yen(result.order.breakEvenUnitPrice)),
      card('営業利益 After', yen(result.after.operatingProfit))
    ].join('');
    $('resourceRows').innerHTML = result.resources.map((resource) => `
      <tr><td>${esc(resource.name)}</td><td>${esc(hours(resource.usedHours))} / ${esc(hours(resource.capacityHours))}</td>
      <td>+${esc(hours(resource.addedHours))}</td><td>${esc(hours(resource.afterHours))}</td><td>${esc(pct(resource.afterUtilization))}</td>
      <td class="${resource.capacityBreach ? 'capacity-breach' : 'capacity-ok'}">${resource.capacityBreach ? 'BREACH' : 'OK'}</td></tr>`).join('');
    $('assumptions').innerHTML = result.assumptions.map((assumption) => `<li>${esc(assumption)}</li>`).join('');
    renderCostAudit(classification);
    renderBridge(baseline, result, classification);
    return result;
  } catch (error) {
    lastResult = null;
    $('decisionBanner').className = 'decision reject';
    $('decisionBanner').textContent = error.message;
    if (!silent) $('dataStatus').textContent = `入力エラー: ${error.message}`;
    return null;
  }
}

function actionPill(action) {
  return `<span class="status-pill ${action.toLowerCase()}">${esc(action)}</span>`;
}

function renderComparisons() {
  $('candidateCount').textContent = `${candidateOrders.length}件`;
  if (candidateOrders.length === 0) {
    $('comparisonRows').innerHTML = '<tr><td colspan="10" class="empty-row">「候補に保存 / 更新」で比較案件を追加してください。</td></tr>';
    return [];
  }
  try {
    const ranked = rankOrdersByBottleneck(profile(), candidateOrders);
    $('comparisonRows').innerHTML = ranked.map((entry, index) => {
      const result = entry.result;
      const capacity = result.bottlenecks[0];
      return `<tr>
        <td>${index + 1}</td><td>${esc(entry.name)}</td><td>${esc(yen(result.order.incrementalContribution))}</td>
        <td>${esc(hours(result.resources.find((resource) => resource.id === 'labor')?.addedHours))}</td>
        <td>${esc(hours(result.resources.find((resource) => resource.id === 'machine')?.addedHours))}</td>
        <td>${esc(entry.tightestResource ?? '—')}</td><td>${esc(yen(entry.contributionPerTightestHour))}</td>
        <td>${capacity ? `${esc(capacity.name)} ${esc(pct(capacity.afterUtilization))}` : '—'}</td><td>${actionPill(result.recommendedAction)}</td>
        <td><button class="secondary small-button" data-action="edit-order" data-id="${esc(entry.id)}" type="button">編集</button> <button class="danger small-button" data-action="delete-order" data-id="${esc(entry.id)}" type="button">削除</button></td>
      </tr>`;
    }).join('');
    return ranked;
  } catch (error) {
    $('comparisonRows').innerHTML = `<tr><td colspan="10" class="empty-row">${esc(error.message)}</td></tr>`;
    return [];
  }
}

function renderScenarios(ranked) {
  let baseline;
  try {
    baseline = companyBaseline(profile());
  } catch (error) {
    $('scenarioRows').innerHTML = `<tr><td colspan="7" class="empty-row">${esc(error.message)}</td></tr>`;
    return;
  }
  const currentResources = profile().resources;
  const currentMax = Math.max(...currentResources.map((resource) => resource.capacityHours > 0 ? resource.usedHours / resource.capacityHours : 0));
  const rows = [`<tr><td>Current</td><td>${esc(yen(baseline.revenue))}</td><td>${esc(yen(baseline.operatingProfit))}</td><td>—</td><td>${esc(pct(currentMax))}</td><td class="capacity-ok">OK</td><td>BASELINE</td></tr>`];
  ranked.forEach((entry) => {
    const result = entry.result;
    const maximum = result.bottlenecks[0]?.afterUtilization ?? null;
    rows.push(`<tr><td>${esc(entry.name)} accepted</td><td>${esc(yen(result.after.revenue))}</td><td>${esc(yen(result.after.operatingProfit))}</td>
      <td>${esc(yen(result.operatingProfitChange))}</td><td>${esc(pct(maximum))}</td>
      <td class="${result.feasibleWithCurrentCapacity ? 'capacity-ok' : 'capacity-breach'}">${result.feasibleWithCurrentCapacity ? 'OK' : 'BREACH'}</td>
      <td>${actionPill(result.recommendedAction)}</td></tr>`);
  });
  $('scenarioRows').innerHTML = rows.join('');
}

function renderAll() {
  evaluateCurrent({silent: true});
  const ranked = renderComparisons();
  renderScenarios(ranked);
}

function saveCandidate() {
  const order = currentOrder();
  if (!selectedOrderId) {
    order.id = newId();
    selectedOrderId = order.id;
  }
  const index = candidateOrders.findIndex((candidate) => candidate.id === order.id);
  if (index >= 0) candidateOrders[index] = clone(order);
  else candidateOrders.push(clone(order));
  $('dataStatus').textContent = `${order.name} を比較候補に保存しました。`;
  renderAll();
}

function editCandidate(id) {
  const order = candidateOrders.find((candidate) => String(candidate.id) === String(id));
  if (!order) return;
  applyOrder(order);
  renderAll();
  $('decisionBanner').scrollIntoView({behavior: 'smooth', block: 'center'});
}

function deleteCandidate(id) {
  candidateOrders = candidateOrders.filter((candidate) => String(candidate.id) !== String(id));
  if (String(selectedOrderId) === String(id)) applyOrder(candidateOrders[0] ?? blankOrder());
  renderAll();
}

function ordersForExport() {
  const draft = currentOrder();
  const orders = clone(candidateOrders);
  const index = orders.findIndex((candidate) => String(candidate.id) === String(draft.id));
  if (index >= 0) orders[index] = draft;
  else if (orders.length === 0) orders.push(draft);
  return orders;
}

function dataset() {
  return {schemaVersion: 1, company: profile(), orders: ordersForExport()};
}

function download(filename, contents, type) {
  const blob = new Blob([contents], {type});
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}

function applyDataset(imported, status) {
  applyCompany(imported.company);
  candidateOrders = clone(imported.orders ?? []);
  applyOrder(candidateOrders[0] ?? blankOrder());
  $('dataStatus').textContent = status;
  renderAll();
}

function loadFixture(key, notify = true) {
  const fixture = cloneFixture(key);
  applyDataset(fixture, notify ? `${fixture.label} を読み込みました。` : '');
  $('fixtureDescription').textContent = fixture.description;
}

function initializeFixtureSelect() {
  $('fixtureSelect').innerHTML = Object.entries(FIXTURES).map(([key, fixture]) => `<option value="${esc(key)}">${esc(fixture.label)}</option>`).join('');
  $('fixtureDescription').textContent = FIXTURES[$('fixtureSelect').value].description;
}

$('addCostItem').addEventListener('click', () => {
  costItems.push({
    name: `追加費用 ${costItems.length + 1}`, amount: 0, behavior: 'variable', attribution: 'unknown',
    changesWithDecision: true, avoidable: false, triggered: false, known: true, enterpriseOperating: true
  });
  renderCostEditor();
  evaluateCurrent({silent: true});
});

$('costEditorRows').addEventListener('input', (event) => {
  const index = Number(event.target.dataset.index);
  const field = event.target.dataset.field;
  if (!Number.isInteger(index) || !field || !costItems[index]) return;
  costItems[index][field] = event.target.type === 'checkbox' ? event.target.checked : field === 'amount' ? Number(event.target.value || 0) : event.target.value;
  evaluateCurrent({silent: true});
});

$('costEditorRows').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="delete-cost"]');
  if (!button) return;
  costItems.splice(Number(button.dataset.index), 1);
  renderCostEditor();
  evaluateCurrent({silent: true});
});

$('comparisonRows').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit-order') editCandidate(button.dataset.id);
  if (button.dataset.action === 'delete-order') deleteCandidate(button.dataset.id);
});

$('evaluate').addEventListener('click', () => evaluateCurrent());
$('saveCandidate').addEventListener('click', saveCandidate);
$('newCandidate').addEventListener('click', () => { applyOrder(blankOrder()); renderAll(); });
$('loadFixture').addEventListener('click', () => loadFixture($('fixtureSelect').value));
$('fixtureSelect').addEventListener('change', () => { $('fixtureDescription').textContent = FIXTURES[$('fixtureSelect').value].description; });
$('companyForm').addEventListener('change', renderAll);
$('orderForm').addEventListener('change', () => evaluateCurrent({silent: true}));

$('saveLocal').addEventListener('click', () => {
  localStorage.setItem('business-decision-lab-dataset', datasetToJson(dataset()));
  $('dataStatus').textContent = '会社設定と候補案件をこのブラウザに保存しました。';
});

$('exportJson').addEventListener('click', () => {
  download('business-decision-lab.json', datasetToJson(dataset()), 'application/json');
  $('dataStatus').textContent = 'JSONを端末へ書き出しました。';
});

$('exportCsv').addEventListener('click', () => {
  download('business-decision-lab.csv', datasetToCsv(dataset()), 'text/csv;charset=utf-8');
  $('dataStatus').textContent = 'CSVを端末へ書き出しました。';
});

$('importData').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', async () => {
  const file = $('fileInput').files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = file.name.toLowerCase().endsWith('.csv') ? datasetFromCsv(text) : datasetFromJson(text);
    applyDataset(imported, `${file.name} をローカルで読み込みました。`);
  } catch (error) {
    $('dataStatus').textContent = `Import失敗: ${error.message}`;
  } finally {
    $('fileInput').value = '';
  }
});

initializeFixtureSelect();
try {
  const saved = localStorage.getItem('business-decision-lab-dataset');
  if (saved) applyDataset(datasetFromJson(saved), '端末保存データを復元しました。');
  else loadFixture('manufacturing', false);
} catch (error) {
  loadFixture('manufacturing', false);
  $('dataStatus').textContent = `保存データを復元できなかったためfixtureを使用しました: ${error.message}`;
}
