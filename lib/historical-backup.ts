import { validPeriod,maxWorkbookBytes } from '../app/history-model.ts';

export type HistoricalBackup={id:string;fileName:string;period:string;bytes:number;uploadedAt:string;uploadedBy:string;sheetNames:string[];base64:string};
export function validHistoricalBackups(value:unknown):value is HistoricalBackup[]{
 if(!Array.isArray(value))return false;const seen=new Set<string>();
 return value.every(item=>{
  if(!item||typeof item!=='object'||typeof item.id!=='string'||!/^[a-f0-9]{64}$/.test(item.id)||seen.has(item.id)||typeof item.fileName!=='string'||item.fileName.length>180||/[\x00-\x1f\\/]/.test(item.fileName)||!item.fileName.toLowerCase().endsWith('.xlsx')||!validPeriod(item.period)||!Number.isInteger(item.bytes)||item.bytes<1||item.bytes>maxWorkbookBytes||typeof item.uploadedAt!=='string'||!Number.isFinite(Date.parse(item.uploadedAt))||typeof item.uploadedBy!=='string'||!item.uploadedBy||!Array.isArray(item.sheetNames)||item.sheetNames.length>40||!item.sheetNames.every((name:unknown)=>typeof name==='string'&&name.length<=31)||typeof item.base64!=='string'||item.base64.length!==4*Math.ceil(item.bytes/3)||!/^UEsD[A-Za-z0-9+/]*={0,2}$/.test(item.base64))return false;
  seen.add(item.id);return true;
 });
}
