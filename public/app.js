import {companyBaseline,evaluateOrder} from './decision.js';

const $=id=>document.getElementById(id);
const yen=v=>v===null||v===undefined?'—':Math.round(v).toLocaleString('ja-JP')+'円';
const pct=v=>v===null||v===undefined?'—':(v*100).toFixed(1)+'%';
const num=v=>Number($(v).value||0);
let lastResult=null;

function profile(){
  return {
    monthlyRevenue:num('monthlyRevenue'),
    variableCosts:num('variableCosts'),
    fixedLaborCost:num('fixedLaborCost'),
    depreciation:num('depreciation'),
    occupancyCost:num('occupancyCost'),
    otherFixedOperatingCosts:num('otherFixedOperatingCosts'),
    employeeCount:num('employeeCount'),
    paidHoursPerEmployee:num('paidHoursPerEmployee'),
    laborHoursAvailable:num('laborCapacity'),
    resources:[
      {id:'labor',name:'労働',type:'labor',capacityHours:num('laborCapacity'),usedHours:num('laborUsed')},
      {id:'machine',name:'設備',type:'equipment',capacityHours:num('machineCapacity'),usedHours:num('machineUsed')}
    ]
  };
}
function order(){
  return {
    name:$('orderName').value.trim(),
    revenue:num('orderRevenue'),
    units:num('orderUnits'),
    materials:num('materials'),
    incrementalLabor:num('incrementalLabor'),
    incrementalEquipment:num('incrementalEquipment'),
    external:num('external'),
    otherRelevantCost:num('otherRelevantCost'),
    stepFixedCost:num('stepFixedCost'),
    knownOpportunityCost:num('knownOpportunityCost'),
    resourceHours:{labor:num('orderLaborHours'),machine:num('orderMachineHours')}
  };
}
function card(label,value){return `<div class="card"><span>${label}</span><strong>${value}</strong></div>`}
function renderBaseline(){
  const b=companyBaseline(profile());
  $('baselineCards').innerHTML=[
    card('限界利益',yen(b.contribution)),
    card('営業利益',yen(b.operatingProfit)),
    card('限界利益率',pct(b.contributionMarginRate)),
    card('固定費カバー率',b.fixedCostCoverage===null?'—':b.fixedCostCoverage.toFixed(2)+'x'),
    card('営業利益 / 労働capacity時',yen(b.operatingProfitPerAvailableLaborHour)),
    card('非労務固定費控除後残余 / 時',yen(b.residualBeforeFixedLaborPerAvailableHour))
  ].join('');
}
function evaluate(){
  try{
    renderBaseline();
    const r=evaluateOrder(profile(),order());lastResult=r;
    const cls=r.recommendedAction.toLowerCase();
    const label=r.recommendedAction==='ACCEPT'?'受注候補':r.recommendedAction==='REJECT'?'受注非推奨':'保留 / capacity確認';
    $('decisionBanner').className='decision '+cls;
    $('decisionBanner').textContent=`${label} — ${r.decisionSignal}`;
    $('orderCards').innerHTML=[
      card('増分利益',yen(r.order.incrementalContribution)),
      card('Relevant Cost',yen(r.order.relevantCostTotal)),
      card('損益分岐売上',yen(r.order.breakEvenRevenue)),
      card('損益分岐単価',yen(r.order.breakEvenUnitPrice)),
      card('営業利益 After',yen(r.after.operatingProfit)),
      card('営業利益変化率',pct(r.operatingProfitChangeRate))
    ].join('');
    $('resourceRows').innerHTML=r.resources.map(x=>`<tr><td>${x.name}</td><td>${x.usedHours.toFixed(1)} / ${x.capacityHours.toFixed(1)}</td><td>+${x.addedHours.toFixed(1)}</td><td>${x.afterHours.toFixed(1)}</td><td>${pct(x.afterUtilization)}</td><td>${x.capacityBreach?'BREACH':'OK'}</td></tr>`).join('');
    $('assumptions').innerHTML=r.assumptions.map(x=>`<li>${x}</li>`).join('');
  }catch(e){
    $('decisionBanner').className='decision reject';
    $('decisionBanner').textContent=e.message;
  }
}
function saveProfile(){
  localStorage.setItem('business-decision-lab-profile',JSON.stringify(profile()));
  $('decisionBanner').className='decision';
  $('decisionBanner').textContent='企業設定をこのブラウザに保存しました。';
}
function restore(){
  try{
    const p=JSON.parse(localStorage.getItem('business-decision-lab-profile')||'null');if(!p)return;
    const map={monthlyRevenue:p.monthlyRevenue,variableCosts:p.variableCosts,fixedLaborCost:p.fixedLaborCost,depreciation:p.depreciation,occupancyCost:p.occupancyCost,otherFixedOperatingCosts:p.otherFixedOperatingCosts,employeeCount:p.employeeCount,paidHoursPerEmployee:p.paidHoursPerEmployee,laborCapacity:p.laborHoursAvailable,laborUsed:p.resources?.find(x=>x.id==='labor')?.usedHours,machineCapacity:p.resources?.find(x=>x.id==='machine')?.capacityHours,machineUsed:p.resources?.find(x=>x.id==='machine')?.usedHours};
    for(const [id,v] of Object.entries(map))if(v!==undefined&&v!==null&&$(id))$(id).value=v;
  }catch{}
}
function exportJson(){
  if(!lastResult)evaluate();
  const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),profile:profile(),order:order(),result:lastResult},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='business-decision-result.json';a.click();URL.revokeObjectURL(a.href);
}
$('evaluate').addEventListener('click',evaluate);
$('saveProfile').addEventListener('click',saveProfile);
$('exportJson').addEventListener('click',exportJson);
document.querySelectorAll('#companyForm input').forEach(x=>x.addEventListener('change',renderBaseline));
restore();renderBaseline();evaluate();
