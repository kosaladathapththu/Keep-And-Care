import type {AppState} from './records.ts';
export function reportRecordDate(value:string){
 const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/);if(iso)return iso[1]+'-'+iso[2]+'-'+iso[3];
 const english=value.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})\b/);if(!english)return '';
 const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(english[2].slice(0,3).toLowerCase());return month<0?'':english[3]+'-'+String(month+1).padStart(2,'0')+'-'+english[1].padStart(2,'0');
}
export function availableReportMonths(data:AppState){return [...new Set([...data.transactions.map(t=>reportRecordDate(t.date)),...data.jobs.map(j=>reportRecordDate(j.date))].filter(Boolean).map(date=>date.slice(0,7)))].sort().reverse()}
export function filterReportState(data:AppState,period:string,name:string){
 if(!period)return {data,notes:[] as string[]};
 const asAt=name==='Outstanding Customer Balances';let omitted=0;
 const jobs=data.jobs.filter(job=>{const date=reportRecordDate(job.date);if(!date){omitted++;return false}return asAt?date.slice(0,7)<=period:date.startsWith(period)});
 const notes:string[]=[];if(omitted)notes.push(omitted+' job(s) have no complete date and are excluded from this month filter.');
 if(asAt)notes.push('Balances use current received amounts for jobs dated on or before this month. The system does not retain historical collection snapshots.');
 if(name==='Staff Salary & Commission Report')notes.push('Commission payments are filtered to this month; base salaries, advances and unpaid commissions are current staff values.');
 return {data:{...data,jobs,transactions:data.transactions.filter(transaction=>reportRecordDate(transaction.date).startsWith(period))},notes};
}
