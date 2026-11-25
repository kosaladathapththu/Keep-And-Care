import {validHistoricalBackups,type HistoricalBackup} from './historical-backup.ts';
import { isRole,normalizeRole,hasFullAccess } from '../app/permissions.ts';
import type { AppState } from '../app/records.ts';

export type BackupUser={id:string;name:string;email:string;role:string;password_hash:string;active:number;created_at:string};
export type BackupAudit={id:string;actor_id:string|null;action:string;target_id:string|null;created_at:string};
export type SystemBackup={format:'keep-care-system-backup';version:1;createdAt:string;appState:AppState|null;users:BackupUser[];audit:BackupAudit[];historicalReports?:HistoricalBackup[]};

function isObject(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value)}
function validDate(value:unknown){return typeof value==='string'&&Number.isFinite(Date.parse(value))}
function validState(value:unknown):value is AppState|null{
 if(value===null)return true;
 if(!isObject(value)||!Array.isArray(value.jobs)||!Array.isArray(value.transactions)||!Array.isArray(value.staff)||!Array.isArray(value.jobTypes)||!Array.isArray(value.services)||!Array.isArray(value.paymentMethods))return false;
 return (value.customers===undefined||Array.isArray(value.customers))&&(value.costTypes===undefined||Array.isArray(value.costTypes))&&(value.expenseCategories===undefined||Array.isArray(value.expenseCategories));
}
export function isSystemBackup(value:unknown,currentDeveloperId:string):value is SystemBackup{
 if(!isObject(value)||value.format!=='keep-care-system-backup'||value.version!==1||!validDate(value.createdAt)||!validState(value.appState)||!Array.isArray(value.users)||!Array.isArray(value.audit))return false;
 if(!value.users.some(item=>isObject(item)&&item.role==='Developer'&&item.active===1))return false;
 if(value.historicalReports!==undefined&&!validHistoricalBackups(value.historicalReports))return false;
 const ids=new Set<string>(),emails=new Set<string>();
 for(const item of value.users){
  if(!isObject(item)||typeof item.id!=='string'||!item.id||typeof item.name!=='string'||!item.name||item.name.length>100||typeof item.email!=='string'||!isRole(normalizeRole(item.role))||typeof item.password_hash!=='string'||!/^scrypt:16384:8:5:[a-f0-9]{32}:[a-f0-9]{64}$/.test(item.password_hash)||![0,1].includes(item.active as number)||!validDate(item.created_at))return false;
  const email=item.email.toLowerCase();
  if(ids.has(item.id)||emails.has(email))return false;
  ids.add(item.id);emails.add(email);
 }
 if(!value.users.some(item=>isObject(item)&&item.id===currentDeveloperId&&isRole(normalizeRole(item.role))&&hasFullAccess(normalizeRole(item.role) as import('../app/permissions.ts').Role)&&item.active===1))return false;
 for(const item of value.audit)if(!isObject(item)||typeof item.id!=='string'||typeof item.action!=='string'||!item.action||!(item.actor_id===null||typeof item.actor_id==='string')||!(item.target_id===null||typeof item.target_id==='string')||!validDate(item.created_at))return false;
 return true;
}
