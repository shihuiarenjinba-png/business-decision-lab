import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyDecisionCost,classifyDecisionCosts} from '../src/costs.js';

test('unchanged fixed labor or equipment cost is excluded from incremental decision',()=>{
  const labor=classifyDecisionCost({name:'salary',amount:500000,behavior:'fixed',attribution:'labor',changesWithDecision:false,avoidable:false});
  const equipment=classifyDecisionCost({name:'depreciation',amount:200000,behavior:'fixed',attribution:'equipment',changesWithDecision:false,avoidable:false});
  assert.equal(labor.relevantToIncrementalDecision,false);
  assert.equal(equipment.relevantToIncrementalDecision,false);
});

test('avoidable fixed cost is relevant only when the decision changes it',()=>{
  const x=classifyDecisionCost({name:'extra lease',amount:100000,behavior:'fixed',attribution:'occupancy',changesWithDecision:true,avoidable:true});
  assert.equal(x.relevantToIncrementalDecision,true);
  assert.equal(x.incrementalAmount,100000);
});

test('allocated cost is not automatically relevant',()=>{
  const x=classifyDecisionCost({name:'head office allocation',amount:80000,behavior:'allocated',attribution:'shared',changesWithDecision:false,avoidable:false});
  assert.equal(x.relevantToIncrementalDecision,false);
  assert.equal(x.reason,'allocated_unavoidable_or_unchanged');
});

test('sunk cost is always excluded from incremental choice',()=>{
  const x=classifyDecisionCost({name:'past design cost',amount:300000,behavior:'sunk',attribution:'other'});
  assert.equal(x.relevantToIncrementalDecision,false);
});

test('known opportunity cost is relevant but unknown opportunity cost is not fabricated',()=>{
  const known=classifyDecisionCost({name:'displaced order',amount:120000,behavior:'opportunity',attribution:'shared',known:true});
  const unknown=classifyDecisionCost({name:'possible future order',amount:120000,behavior:'opportunity',attribution:'shared',known:false});
  assert.equal(known.relevantToIncrementalDecision,true);
  assert.equal(unknown.relevantToIncrementalDecision,false);
});

test('classification keeps attribution separate from relevance',()=>{
  const x=classifyDecisionCosts([
    {name:'overtime',amount:50000,behavior:'variable',attribution:'labor',changesWithDecision:true},
    {name:'existing depreciation',amount:90000,behavior:'fixed',attribution:'equipment',changesWithDecision:false,avoidable:false},
    {name:'materials',amount:120000,behavior:'variable',attribution:'materials',changesWithDecision:true}
  ]);
  assert.equal(x.relevantTotal,170000);
  assert.equal(x.excludedTotal,90000);
  assert.equal(x.byAttribution.labor,50000);
  assert.equal(x.byAttribution.equipment,90000);
  assert.equal(x.byAttribution.materials,120000);
});
