import type { AppState,RecordKind } from './records';
export const roles=['GM','Assistant','CFO','Developer'] as const;
export type Role=typeof roles[number];
export type SessionUser={id:string;name:string;email:string;role:Role};
export const financialKeys=['salary','advances','commission'] as const;
export function normalizeRole(value:unknown):unknown{return value==='Assistant GM'?'Assistant':value}
export function isRole(value:unknown):value is Role{return roles.includes(value as Role)}
export function hasFullAccess(role:Role){return role==='GM'||role==='Assistant'||role==='Developer'}
export function canFinance(role:Role){return role==='CFO'||hasFullAccess(role)}
export function canOperate(role:Role){return hasFullAccess(role)}
export function canSection(role:Role,section:string){if(section==='Users')return hasFullAccess(role);if(section==='Finance')return canFinance(role);if(section==='New job')return canOperate(role);return ['Overview','Jobs','Customers','Staff','Reports','Settings','Account'].includes(section)}
export function canReport(role:Role,name:string){return canFinance(role)||['Jobs Register','Outstanding Customer Balances'].includes(name)}
export function canEditRecord(role:Role,kind:RecordKind){return hasFullAccess(role)||['job','staff','transaction','paymentMethod','expenseCategory'].includes(kind)}
export function canDeleteRecord(role:Role,kind:RecordKind){return canEditRecord(role,kind)&&!(role==='CFO'&&['job','staff'].includes(kind))}
export function canEditField(role:Role,kind:RecordKind,field:string){if(!canEditRecord(role,kind))return false;if(role==='CFO'&&kind==='job')return field==='paid';if(role==='CFO'&&kind==='staff')return financialKeys.includes(field as typeof financialKeys[number]);return true}
export function visibleState(data:AppState,_role:Role):AppState{return data}
function equal(a:unknown,b:unknown){return JSON.stringify(a)===JSON.stringify(b)}
function check(condition:boolean,message='Your role cannot change these records.'){if(!condition)throw Error(message)}
export function authorizeStateChange(current:AppState,submitted:AppState,role:Role):AppState{
 const allowed=new Set(['customers','costTypes','expenseCategories','jobs','transactions','staff','jobTypes','services','paymentMethods']);check(Object.keys(submitted).every(key=>allowed.has(key)),'Unknown application fields.');
 for(const key of ['jobs','transactions','staff','jobTypes','services','paymentMethods'] as const)check(Array.isArray(submitted[key]),'Invalid application records.');
 for(const key of ['customers','costTypes','expenseCategories'] as const)check(submitted[key]===undefined||Array.isArray(submitted[key]),'Invalid application records.');
 if(hasFullAccess(role))return submitted;
 const permitted=['transactions','staff','jobs','paymentMethods','expenseCategories'];
 for(const key of allowed)if(!permitted.includes(key))check(equal(submitted[key as keyof AppState],current[key as keyof AppState]));
 check(submitted.jobs.length===current.jobs.length&&new Set(submitted.jobs.map(j=>j.id)).size===current.jobs.length);
 for(const job of submitted.jobs){const original=current.jobs.find(item=>item.id===job.id);check(!!original);check(equal({...job,paid:0},{...original,paid:0}),'Finance may update collections, but not service details.');}
 check(submitted.staff.length===current.staff.length&&new Set(submitted.staff.map(s=>s.id)).size===current.staff.length);
 for(const member of submitted.staff){const original=current.staff.find(item=>item.id===member.id);check(!!original);check(equal({...member,salary:0,advances:0,commission:0},{...original,salary:0,advances:0,commission:0}),'Finance may update payroll, but not staff profiles.');}
 return {...current,...submitted};
}
