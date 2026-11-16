import assert from 'node:assert/strict';
import test from 'node:test';
import {companyBaseline,evaluateOrder} from '../src/decision.js';

const profile={
  monthlyRevenue:5_000_000,
  variableCosts:3_000_000,
  fixedOperatingCosts:1_500_000,
  laborHoursAvailable:1_120,
  resources:[
    {id:'labor',type:'labor',capacityHours:1120,usedHours:780},
    {id:'machine-b',type:'equipment',capacityHours:180,usedHours:150}
  ]
};

test('baseline separates contribution from fixed operating cost',()=>{
  const x=companyBaseline(profile);
  assert.equal(x.contribution,2_000_000);
  assert.equal(x.operatingProfit,500_000);
  assert.equal(x.fixedCostCoverage,2_000_000/1_500_000);
});

test('unchanged fixed cost is not reallocated to an incremental order',()=>{
  const x=evaluateOrder(profile,{revenue:1_000_000,materials:500_000,incrementalLabor:100_000,resourceHours:{labor:60}});
  assert.equal(x.order.relevantCostTotal,600_000);
  assert.equal(x.order.incrementalContribution,400_000);
  assert.equal(x.after.operatingProfit,900_000);
  assert.equal(x.operatingProfitChangeRate,0.8);
  assert.equal(x.decisionSignal,'POSITIVE_INCREMENTAL_VALUE');
});

test('step-fixed cost is included when the decision triggers it',()=>{
  const x=evaluateOrder(profile,{revenue:1_000_000,materials:500_000,stepFixedCost:250_000,resourceHours:{labor:40}});
  assert.equal(x.order.incrementalContribution,250_000);
});

test('capacity breach is explicit even when incremental contribution is positive',()=>{
  const x=evaluateOrder(profile,{revenue:800_000,materials:200_000,resourceHours:{'machine-b':40}});
  assert.equal(x.order.incrementalContribution,600_000);
  assert.equal(x.feasibleWithCurrentCapacity,false);
  assert.equal(x.decisionSignal,'CAPACITY_HOLD');
  assert.equal(x.resources.find(r=>r.id==='machine-b').afterHours,190);
});

test('known opportunity cost may be supplied, but is never inferred',()=>{
  const noAlt=evaluateOrder(profile,{revenue:300_000,materials:100_000});
  const withAlt=evaluateOrder(profile,{revenue:300_000,materials:100_000,knownOpportunityCost:80_000});
  assert.equal(noAlt.order.incrementalContribution,200_000);
  assert.equal(withAlt.order.incrementalContribution,120_000);
});
