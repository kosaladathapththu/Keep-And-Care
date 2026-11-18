import type { AdditionalCost } from './records';
export const defaultCostTypes=['Transport','Spare parts','Materials','Gas refill','Other'];
export function calculateJobCharges(baseCharge:number,costs:AdditionalCost[]=[]){
 const cents=(value:number)=>{if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100)))throw Error('Enter a valid non-negative charge.');return Math.round(value*100)};
 const base=cents(baseCharge);let extra=0;
 const ids=new Set<string>();
 for(const cost of costs){if(!cost.id||ids.has(cost.id))throw Error('Each additional cost must have a unique reference.');ids.add(cost.id);if(!cost.type.trim())throw Error('Enter a type for every additional cost.');const value=cents(cost.amount);if(value<=0)throw Error('Additional cost amounts must be greater than zero.');extra+=value}
 if(!Number.isSafeInteger(base+extra))throw Error('The job total is too large.');
 return {baseCharge:base/100,additionalTotal:extra/100,total:(base+extra)/100};
}
