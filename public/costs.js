function money(name,value){
  const n=Number(value);
  if(!Number.isFinite(n)||n<0)throw new Error(name+' must be a non-negative finite number');
  return n;
}

const BEHAVIORS=new Set(['variable','fixed','step_fixed','sunk','allocated','opportunity']);
const ATTRIBUTIONS=new Set(['labor','equipment','materials','occupancy','external','shared','financing','tax','other','unknown']);

export function classifyDecisionCost(item,index=0){
  const name=String(item?.name??('cost-'+(index+1)));
  const amount=money(name+'.amount',item?.amount??0);
  const behavior=String(item?.behavior??'unknown');
  if(!BEHAVIORS.has(behavior))throw new Error(name+'.behavior is invalid');
  const attribution=String(item?.attribution??'unknown');
  if(!ATTRIBUTIONS.has(attribution))throw new Error(name+'.attribution is invalid');

  const changesWithDecision=item?.changesWithDecision===true;
  const avoidable=item?.avoidable===true;
  const triggered=item?.triggered===true;
  const known=item?.known!==false;
  const enterpriseOperating=item?.enterpriseOperating!==false;

  let relevant=false;
  let reason='excluded_by_default';

  if(behavior==='variable'){
    relevant=changesWithDecision;
    reason=relevant?'variable_changes_with_decision':'variable_but_no_incremental_change';
  }else if(behavior==='fixed'){
    relevant=changesWithDecision&&avoidable;
    reason=relevant?'avoidable_fixed_changes_with_decision':'unchanged_or_unavoidable_fixed';
  }else if(behavior==='step_fixed'){
    relevant=triggered&&changesWithDecision;
    reason=relevant?'triggered_step_fixed':'step_fixed_not_triggered';
  }else if(behavior==='opportunity'){
    relevant=known&&amount>0;
    reason=relevant?'known_opportunity_cost':'unknown_opportunity_cost';
  }else if(behavior==='sunk'){
    relevant=false;
    reason='sunk_cost';
  }else if(behavior==='allocated'){
    relevant=changesWithDecision&&avoidable;
    reason=relevant?'allocated_but_economically_avoidable':'allocated_unavoidable_or_unchanged';
  }

  return {
    name,amount,behavior,attribution,
    changesWithDecision,avoidable,triggered,known,enterpriseOperating,
    relevantToIncrementalDecision:relevant,
    incrementalAmount:relevant?amount:0,
    excludedAmount:relevant?0:amount,
    reason
  };
}

export function classifyDecisionCosts(items=[]){
  if(!Array.isArray(items))throw new Error('cost items must be an array');
  const classified=items.map(classifyDecisionCost);
  return {
    items:classified,
    relevantTotal:classified.reduce((s,x)=>s+x.incrementalAmount,0),
    excludedTotal:classified.reduce((s,x)=>s+x.excludedAmount,0),
    enterpriseOperatingTotal:classified.filter(x=>x.enterpriseOperating).reduce((s,x)=>s+x.amount,0),
    byAttribution:Object.fromEntries([...ATTRIBUTIONS].map(key=>[
      key,
      classified.filter(x=>x.attribution===key).reduce((s,x)=>s+x.amount,0)
    ]))
  };
}

export const COST_BEHAVIORS=[...BEHAVIORS];
export const COST_ATTRIBUTIONS=[...ATTRIBUTIONS];
