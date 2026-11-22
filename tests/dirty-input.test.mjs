import assert from 'node:assert/strict';
import test from 'node:test';
import {companyBaseline,evaluateOrder} from '../src/decision.js';

const profile={
  monthlyRevenue:5_000_000,
  variableCosts:3_000_000,
  fixedOperatingCosts:1_500_000,
  laborHoursAvailable:1120,
  resources:[{id:'labor',capacityHours:1120,usedHours:780}]
};

test('blank required monthly revenue is rejected instead of becoming zero',()=>{
  assert.throws(()=>companyBaseline({...profile,monthlyRevenue:''}),/monthlyRevenue is required/);
  assert.throws(()=>companyBaseline({...profile,monthlyRevenue:'   '}),/monthlyRevenue is required/);
});

test('blank required order revenue is rejected instead of becoming zero',()=>{
  assert.throws(()=>evaluateOrder(profile,{revenue:'',materials:10}),/order\.revenue is required/);
  assert.throws(()=>evaluateOrder(profile,{revenue:'   ',materials:10}),/order\.revenue is required/);
});

test('whitespace numeric strings are accepted but malformed and negative values fail closed',()=>{
  const x=evaluateOrder({...profile,monthlyRevenue:' 5000000 '},{revenue:' 1000000 ',materials:' 400000 '});
  assert.equal(x.order.revenue,1_000_000);
  assert.equal(x.order.relevantCostTotal,400_000);
  assert.throws(()=>evaluateOrder(profile,{revenue:'abc'}),/finite number/);
  assert.throws(()=>evaluateOrder(profile,{revenue:1000,materials:-1}),/finite number/);
  assert.throws(()=>evaluateOrder(profile,{revenue:Infinity}),/finite number/);
});

test('dirty capacity and additional-cost structures are rejected',()=>{
  assert.throws(()=>evaluateOrder({...profile,resources:[{id:'labor',capacityHours:100,usedHours:101}]},{revenue:1000}),/cannot exceed/);
  assert.throws(()=>evaluateOrder(profile,{revenue:1000,additionalCostItems:[{name:'x',amount:10,behavior:'mystery'}]}),/behavior is invalid/);
});
