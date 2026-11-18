import { calculateJobCharges, defaultCostTypes } from './job-costs.ts';
export type Status = 'New' | 'In progress' | 'Awaiting payment' | 'Completed';
export type AdditionalCost = { id:string; type:string; amount:number };
export type Job = { id:string; customer:string; type:string; service:string; technician:string; technicianIds?:string[]; date:string; total:number; baseCharge?:number; additionalCosts?:AdditionalCost[]; paid:number; status:Status };
export type Transaction = { id:string; date:string; description:string; category:string; kind:'Income'|'Expense'; method:string; amount:number; jobId?:string; staffId?:string; commissionBatchId?:string };
export type Staff = { id:string; name:string; role:string; phone:string; salary:number; advances:number; commission:number };
export type Customer = { id:string; name:string; phone:string; email:string; address:string };
export type AppState = { customers?:Customer[]; costTypes?:string[]; expenseCategories?:string[]; jobs:Job[]; transactions:Transaction[]; staff:Staff[]; jobTypes:string[]; services:{name:string;price:number}[]; paymentMethods:string[] };
export type RecordKind = 'job'|'customer'|'staff'|'transaction'|'jobType'|'service'|'paymentMethod'|'expenseCategory'|'costType';
export type RecordTarget = {kind:RecordKind;id:string};
export type RecordValues = Record<string,string|number>;
export const defaultExpenses=['Transport','Meals','Tools & materials','Commission','Salary / advance','Gas and spare parts','Other expense'];
const same=(a:string,b:string)=>a.trim().toLowerCase()===b.trim().toLowerCase();
export function recordValues(data:AppState,target:RecordTarget):RecordValues{
 switch(target.kind){
 case 'job':{const job=data.jobs.find(j=>j.id===target.id)!;return {...job,baseCharge:job.baseCharge??job.total-(job.additionalCosts||[]).reduce((sum,cost)=>sum+cost.amount,0),additionalCostsJson:JSON.stringify(job.additionalCosts||[])} as unknown as RecordValues;}
 case 'staff':return {...data.staff.find(s=>s.id===target.id)!};
 case 'transaction':return {...data.transactions.find(t=>t.id===target.id)!};
 case 'customer':return {...(data.customers||[]).find(c=>same(c.name,target.id))||{name:target.id,phone:'',email:'',address:''}};
 case 'service':return {...data.services.find(s=>s.name===target.id)!};
 default:return {name:target.id};
 }
}
function required(v:RecordValues,key:string){const value=String(v[key]??'').trim();if(!value)throw Error('Please enter '+key+'.');return value;}
function amount(v:RecordValues,key:string){const value=Number(v[key]);if(!Number.isFinite(value)||value<0||!Number.isSafeInteger(Math.round(value*100)))throw Error(key+' must be a valid, non-negative amount.');return Math.round(value*100)/100;}
export function editRecord(data:AppState,target:RecordTarget,values:RecordValues):AppState{
 const {kind,id}=target;
 if(kind==='customer'){
  const name=required(values,'name');if(!same(name,id)&&[...(data.customers||[]).map(c=>c.name),...data.jobs.map(j=>j.customer)].some(n=>same(n,name)))throw Error('A customer with this name already exists.');
  const existing=(data.customers||[]).find(c=>same(c.name,id));const customer:Customer={id:existing?.id||crypto.randomUUID(),name,phone:String(values.phone||'').trim(),email:String(values.email||'').trim(),address:String(values.address||'').trim()};
  return {...data,customers:[...(data.customers||[]).filter(c=>!same(c.name,id)),customer],jobs:data.jobs.map(j=>same(j.customer,id)?{...j,customer:name}:j)};
 }
 if(kind==='job'){
  const job=data.jobs.find(j=>j.id===id);if(!job)throw Error('Job no longer exists.');const additionalCosts:AdditionalCost[]=values.additionalCostsJson!==undefined?JSON.parse(String(values.additionalCostsJson)):job.additionalCosts||[];if(!Array.isArray(additionalCosts))throw Error('Invalid additional costs.');const charges=calculateJobCharges(amount(values,values.baseCharge!==undefined?'baseCharge':'total'),additionalCosts),total=charges.total,paid=amount(values,'paid');if(paid>total)throw Error('Paid amount cannot exceed the total.');
  const customer=required(values,'customer'),technician=required(values,'technician');if(!['New','In progress','Awaiting payment','Completed'].includes(String(values.status)))throw Error('Select a valid job status.');
  return {...data,costTypes:additionalCosts.length?[...new Set([...(data.costTypes||defaultCostTypes),...additionalCosts.map(cost=>cost.type.trim())])]:data.costTypes,jobs:data.jobs.map(j=>j.id===id?{...j,customer,technician,technicianIds:technician===j.technician?j.technicianIds:undefined,type:required(values,'type'),service:required(values,'service'),date:required(values,'date'),baseCharge:charges.baseCharge,additionalCosts:additionalCosts.map(cost=>({...cost,type:cost.type.trim(),amount:Math.round(cost.amount*100)/100})),total,paid,status:values.status as Status}:j)};
 }
 if(kind==='staff'){
  const old=data.staff.find(s=>s.id===id);if(!old)throw Error('Staff record no longer exists.');const name=required(values,'name');
  return {...data,staff:data.staff.map(s=>s.id===id?{...s,name,role:required(values,'role'),phone:String(values.phone||'').trim(),salary:amount(values,'salary'),advances:amount(values,'advances'),commission:amount(values,'commission')}:s),jobs:data.jobs.map(j=>j.technicianIds?.includes(id)?{...j,technician:j.technicianIds.map(staffId=>staffId===id?name:data.staff.find(s=>s.id===staffId)?.name||'Unknown staff').join(' & ')}:j)};
 }
 if(kind==='transaction'){
  const old=data.transactions.find(t=>t.id===id);if(!old)throw Error('Transaction no longer exists.');if(!['Income','Expense'].includes(String(values.kind)))throw Error('Select income or expense.');const jobId=String(values.jobId||'');if(jobId&&!data.jobs.some(j=>j.id===jobId))throw Error('Select an existing job.');
  return {...data,transactions:data.transactions.map(t=>t.id===id?{...t,date:required(values,'date'),description:required(values,'description'),kind:t.commissionBatchId?'Expense':values.kind as 'Income'|'Expense',category:t.commissionBatchId?'Commission':required(values,'category'),jobId:t.commissionBatchId?t.jobId:jobId,method:required(values,'method'),amount:amount(values,'amount')}:t)};
 }
 const name=required(values,'name');
 if(kind==='service'){if(data.services.some(s=>s.name!==id&&same(s.name,name)))throw Error('This service already exists.');return {...data,services:data.services.map(s=>s.name===id?{name,price:amount(values,'price')}:s),jobs:data.jobs.map(j=>j.service===id?{...j,service:name}:j)};}
 if(kind==='costType'){const items=data.costTypes||defaultCostTypes;if(items.some(n=>n!==id&&same(n,name)))throw Error('This cost type already exists.');return {...data,costTypes:items.map(n=>n===id?name:n),jobs:data.jobs.map(j=>({...j,additionalCosts:j.additionalCosts?.map(cost=>cost.type===id?{...cost,type:name}:cost)}))};}
 const key=kind==='jobType'?'jobTypes':kind==='paymentMethod'?'paymentMethods':'expenseCategories';const items=data[key]||defaultExpenses;
 if(items.some(n=>n!==id&&same(n,name)))throw Error('This record already exists.');
 return {...data,[key]:items.map(n=>n===id?name:n),jobs:kind==='jobType'?data.jobs.map(j=>j.type===id?{...j,type:name}:j):data.jobs,transactions:data.transactions.map(t=>kind==='paymentMethod'&&t.method===id?{...t,method:name}:kind==='expenseCategory'&&t.category===id?{...t,category:name}:t)};
}
export function deleteRecord(data:AppState,{kind,id}:RecordTarget):AppState{
 if(kind==='customer'){if(data.jobs.some(j=>same(j.customer,id)))throw Error('This customer has service jobs. Delete or reassign those jobs first.');return {...data,customers:(data.customers||[]).filter(c=>!same(c.name,id))};}
 if(kind==='job'){if(data.transactions.some(t=>t.jobId===id))throw Error('This job has linked transactions. Remove or reassign them first.');return {...data,jobs:data.jobs.filter(j=>j.id!==id)};}
 if(kind==='staff'){const staff=data.staff.find(s=>s.id===id);if(data.transactions.some(t=>t.staffId===id)||data.jobs.some(j=>j.technicianIds?.includes(id)||(staff&&j.technician.includes(staff.name))))throw Error('This staff member has linked jobs or payments. Keep the record to preserve their history.');return {...data,staff:data.staff.filter(s=>s.id!==id)};}
 if(kind==='transaction'){const transaction=data.transactions.find(t=>t.id===id);return {...data,transactions:data.transactions.filter(t=>transaction?.commissionBatchId?t.commissionBatchId!==transaction.commissionBatchId:t.id!==id)};}
 if(kind==='service'){if(data.jobs.some(j=>j.service===id))throw Error('This service is used by a job. Reassign the job first.');return {...data,services:data.services.filter(s=>s.name!==id)};}
 if(kind==='jobType'){if(data.jobs.some(j=>j.type===id))throw Error('This job type is in use. Reassign its jobs first.');return {...data,jobTypes:data.jobTypes.filter(n=>n!==id)};}
 if(kind==='paymentMethod'){if(data.transactions.some(t=>t.method===id))throw Error('This payment method is used by transactions. Reassign them first.');return {...data,paymentMethods:data.paymentMethods.filter(n=>n!==id)};}
 if(kind==='costType'){if(data.jobs.some(j=>j.additionalCosts?.some(cost=>cost.type===id)))throw Error('This cost type is used by jobs. Edit or remove those costs first.');return {...data,costTypes:(data.costTypes||defaultCostTypes).filter(n=>n!==id)};}
 if(data.transactions.some(t=>t.category===id))throw Error('This expense category is used by transactions. Reassign them first.');return {...data,expenseCategories:(data.expenseCategories||defaultExpenses).filter(n=>n!==id)};
}
