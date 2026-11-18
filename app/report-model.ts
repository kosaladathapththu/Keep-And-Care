import type { AppState } from './records';
import type { ReportRows } from './report-downloads';
const round=(value:number)=>Math.round(value*100)/100;
const sum=(values:number[])=>round(values.reduce((total,value)=>total+Math.round(value*100),0)/100);
export function reportNotes(name:string):string[]{
 if(name==='Trial Balance')return ['Cash-basis management trial balance from recorded receipts and payments. Opening balances and journal entries are not available; customer receivables are reported separately.'];
 if(name==='Cash Flow Statement')return ['Direct-method cash movements from recorded transactions. Cumulative movement excludes any opening cash or bank balance.'];
 if(name==='Income & Expense Report')return ['Cash basis: recorded income and expense transactions, grouped by category. This is not an accrual profit and loss statement.'];
 if(name==='Staff Salary & Commission Report')return ['Estimated payable = base salary + unpaid commission - advances. Paid job commissions are shown separately and are not added again to estimated payable. Salary payment reconciliation is not available in the current records.'];
 if(name==='Outstanding Customer Balances')return ['Outstanding balances are grouped by customer and include only jobs with an unpaid balance.'];
 return ['Service charge and additional costs are included in the total billed. Received amounts reflect the job register.'];
}
export function isReportTotal(row:(string|number)[]){return row.some(value=>typeof value==='string'&&/^(TOTAL|TOTAL .+|NET .+|ESTIMATED .+)$/i.test(value))}
export function buildReportRows(data:AppState,name:string):ReportRows{
 const income=sum(data.transactions.filter(t=>t.kind==='Income').map(t=>t.amount)),expenses=sum(data.transactions.filter(t=>t.kind==='Expense').map(t=>t.amount));
 const grouped=new Map<string,number>();for(const t of data.transactions.filter(t=>t.kind==='Expense'))grouped.set(t.category,round((grouped.get(t.category)||0)+t.amount));
 if(name==='Trial Balance'){
  const net=round(income-expenses),rows:ReportRows=[['Account','Debit (Rs.)','Credit (Rs.)'],['Cash / bank - net recorded movement',Math.max(0,net),Math.max(0,-net)],...Array.from(grouped,([category,amount])=>[category,amount,0]),['Recorded income',0,income]];
  rows.push(['TOTAL',sum(rows.slice(1).map(row=>Number(row[1]))),sum(rows.slice(1).map(row=>Number(row[2])))]);return rows;
 }
 if(name==='Cash Flow Statement'){
  let movement=0;const rows:ReportRows=[['Date','Reference','Description','Payment method','Receipts (Rs.)','Payments (Rs.)','Cumulative movement (Rs.)']];
  for(const t of [...data.transactions].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))){movement=round(movement+(t.kind==='Income'?t.amount:-t.amount));rows.push([t.date,t.id,t.description,t.method,t.kind==='Income'?t.amount:0,t.kind==='Expense'?t.amount:0,movement])}
  rows.push(['','TOTAL','','',income,expenses,round(income-expenses)]);return rows;
 }
 if(name==='Income & Expense Report'){
  const categories=new Map<string,{income:number;expense:number}>();for(const t of data.transactions){const key=t.kind+':'+t.category,value=categories.get(key)||{income:0,expense:0};if(t.kind==='Income')value.income=round(value.income+t.amount);else value.expense=round(value.expense+t.amount);categories.set(key,value)}
  return [['Category','Income (Rs.)','Expense (Rs.)'],...Array.from(categories,([key,value])=>[key.slice(key.indexOf(':')+1),value.income,value.expense]),['TOTAL',income,expenses],['NET CASH RESULT',round(income-expenses),'']];
 }
 if(name==='Outstanding Customer Balances'){
  const customers=new Map<string,{name:string;count:number;billed:number;paid:number}>();for(const j of data.jobs.filter(j=>j.total>j.paid)){const key=j.customer.trim().toLowerCase(),value=customers.get(key)||{name:j.customer,count:0,billed:0,paid:0};value.count++;value.billed=round(value.billed+j.total);value.paid=round(value.paid+j.paid);customers.set(key,value)}
  const rows:ReportRows=[['Customer','Unpaid jobs','Billed (Rs.)','Received (Rs.)','Outstanding (Rs.)'],...Array.from(customers.values()).map(c=>[c.name,c.count,c.billed,c.paid,round(c.billed-c.paid)])];rows.push(['TOTAL',sum(rows.slice(1).map(r=>Number(r[1]))),sum(rows.slice(1).map(r=>Number(r[2]))),sum(rows.slice(1).map(r=>Number(r[3]))),sum(rows.slice(1).map(r=>Number(r[4])))]);return rows;
 }
 if(name==='Staff Salary & Commission Report'){
  const rows:ReportRows=[['Staff ID','Name','Role','Base salary (Rs.)','Unpaid commission (Rs.)','Commission paid (Rs.)','Advances (Rs.)','Estimated payable (Rs.)'],...data.staff.map(s=>[s.id,s.name,s.role,s.salary,s.commission,sum(data.transactions.filter(t=>t.staffId===s.id&&t.commissionBatchId).map(t=>t.amount)),s.advances,round(s.salary+s.commission-s.advances)])];rows.push(['TOTAL','','',...Array.from({length:5},(_,index)=>sum(rows.slice(1).map(r=>Number(r[index+3]))))]);return rows;
 }
 const rows:ReportRows=[['Job No.','Customer','Job Type','Service','Technician','Date','Service charge (Rs.)','Additional costs (Rs.)','Total (Rs.)','Paid (Rs.)','Outstanding (Rs.)','Status'],...data.jobs.map(j=>{const extra=sum((j.additionalCosts||[]).map(c=>c.amount));return [j.id,j.customer,j.type,j.service,j.technician,j.date,j.baseCharge??round(j.total-extra),extra,j.total,j.paid,round(j.total-j.paid),j.status]})];rows.push(['TOTAL','','','','','',...Array.from({length:5},(_,index)=>sum(rows.slice(1).map(r=>Number(r[index+6])))),'']);return rows;
}
