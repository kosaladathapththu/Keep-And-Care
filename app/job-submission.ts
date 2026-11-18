import { calculateJobCharges,defaultCostTypes } from './job-costs.ts';
import type { AppState, Customer, Job, AdditionalCost } from './records';

export type NewJobInput = {
 customerMode:'existing'|'new'; existingCustomer?:string;
 name?:string; phone?:string; email?:string; address?:string;
 type:string; service:string; technicianIds:string[]; price:number; additionalCosts?:AdditionalCost[];
};
const key=(name:string)=>name.trim().toLowerCase();
export function availableCustomers(data:AppState):Customer[]{
 const customers=new Map<string,Customer>();
 for(const customer of data.customers||[])customers.set(key(customer.name),customer);
 for(const job of data.jobs)if(!customers.has(key(job.customer)))customers.set(key(job.customer),{id:'legacy:'+job.customer,name:job.customer,phone:'',email:'',address:''});
 return [...customers.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function createJobSubmission(data:AppState,input:NewJobInput):AppState{
 const customers=availableCustomers(data);let customer:Customer;
 if(input.customerMode==='existing'){
  const existing=customers.find(c=>key(c.name)===key(input.existingCustomer||''));
  if(!existing)throw Error('Select an existing customer.');customer=existing;
 }else if(input.customerMode==='new'){
  const name=(input.name||'').trim();if(!name)throw Error('Enter the customer name.');
  if(customers.some(c=>key(c.name)===key(name)))throw Error('This customer already exists. Choose Existing customer to use their saved details.');
  const email=(input.email||'').trim();if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address.');
  customer={id:crypto.randomUUID(),name,phone:(input.phone||'').trim(),email,address:(input.address||'').trim()};
 }else throw Error('Choose existing customer or new customer.');
 if(!data.jobTypes.includes(input.type))throw Error('Select a valid job type.');
 if(!data.services.some(s=>s.name===input.service))throw Error('Select a valid service.');
 if(!Number.isFinite(input.price)||input.price<0||!Number.isSafeInteger(Math.round(input.price*100)))throw Error('Enter a valid estimated charge.');
 const technicianIds=[...new Set(input.technicianIds)];if(technicianIds.some(id=>!data.staff.some(s=>s.id===id&&s.role==='Technician')))throw Error('Select valid technicians.');
 const additionalCosts=(input.additionalCosts||[]).map(cost=>({...cost,type:cost.type.trim()})),charges=calculateJobCharges(input.price,additionalCosts);
 const now=new Date();const job:Job={id:`KC-${now.getFullYear().toString().slice(-2)}${String(now.getMonth()+1).padStart(2,'0')}-${crypto.randomUUID().slice(0,8)}`,customer:customer.name,type:input.type,service:input.service,technician:technicianIds.map(id=>data.staff.find(s=>s.id===id)!.name).join(' & ')||'Unassigned',technicianIds,date:now.toLocaleString('en-LK',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Colombo'}),baseCharge:charges.baseCharge,additionalCosts:additionalCosts.map(cost=>({...cost,type:cost.type.trim(),amount:Math.round(cost.amount*100)/100})),total:charges.total,paid:0,status:'New'};
 const savedCustomers=data.customers||[];
 return {...data,costTypes:additionalCosts.length?[...new Set([...(data.costTypes||defaultCostTypes),...additionalCosts.map(cost=>cost.type.trim())])]:data.costTypes,customers:savedCustomers.some(c=>key(c.name)===key(customer.name))?savedCustomers:[...savedCustomers,customer.id.startsWith('legacy:')?{...customer,id:crypto.randomUUID()}:customer],jobs:[job,...data.jobs]};
}
