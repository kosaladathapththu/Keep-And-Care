import {createHash} from 'node:crypto';
import { normalizeRole } from '../../../permissions';
import { audit,authFailure,json,rateLimit,readObject,requireUser,sameOrigin,startSession,AuthError } from '../../../../lib/auth';
import { isSystemBackup,type BackupAudit,type BackupUser } from '../../../../lib/backup';
import { queryRows,withTransaction } from '../../../../lib/database';
import type { AppState } from '../../../records';

export async function GET(request:Request){
 try{
  await requireUser(request,'Developer');
  const [state]=await queryRows<{payload:string}&import('mysql2/promise').RowDataPacket>('SELECT payload FROM app_state WHERE id=1');
  const users=await queryRows<BackupUser&import('mysql2/promise').RowDataPacket>('SELECT id,name,email,role,password_hash,active,created_at FROM auth_users ORDER BY created_at');
  const auditTrail=await queryRows<BackupAudit&import('mysql2/promise').RowDataPacket>('SELECT id,actor_id,action,target_id,created_at FROM auth_audit ORDER BY created_at');
  const archiveRows=await queryRows<import('mysql2/promise').RowDataPacket>('SELECT * FROM historical_reports');
  const historicalReports=archiveRows.map(row=>({id:row.id,fileName:row.file_name,period:row.period,bytes:row.bytes,uploadedAt:row.uploaded_at,uploadedBy:row.uploaded_by,sheetNames:JSON.parse(row.sheet_names),base64:Buffer.from(row.content).toString('base64')}));
  const backup={historicalReports,format:'keep-care-system-backup',version:1,createdAt:new Date().toISOString(),appState:state?JSON.parse(state.payload) as AppState:null,users,audit:auditTrail};
  if(JSON.stringify(backup).length>20*1024*1024)throw new AuthError('This system backup exceeds 20 MB. Use a full cPanel database backup to include all historical workbooks.',413);
  const filename=`keep-and-care-backup-${new Date().toISOString().slice(0,10)}.json`;
  return json({backup},200,{'content-disposition':`attachment; filename="${filename}"`,'cache-control':'no-store, private'});
 }catch(error){return authFailure(error)}
}

export async function POST(request:Request){
 try{
  sameOrigin(request);
  const actor=await requireUser(request,'Developer');
  const contentLength=Number(request.headers.get('content-length')||0);
  if(contentLength>20*1024*1024)throw new AuthError('Backup file is too large (maximum 20 MB).',413);
  await rateLimit(request,'backup-restore:'+actor.id,3);
  const input=await readObject(request);
  const candidate=input.backup;
  if((JSON.stringify(candidate)||'').length>20*1024*1024)throw new AuthError('Backup file is too large (maximum 20 MB).',413);
  if(!isSystemBackup(candidate,actor.id))throw new AuthError('This backup is invalid, unsupported, or does not preserve your active full-access account.');
  const backup=candidate;
  for(const report of backup.historicalReports||[]){if(createHash('sha256').update(Buffer.from(report.base64,'base64')).digest('hex')!==report.id)throw new AuthError('A historical workbook in this backup failed its file-integrity check.');}

  await withTransaction(async connection=>{
   if(backup.appState){
    await connection.execute('INSERT INTO app_state (id,payload,updated_at) VALUES (1,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),updated_at=VALUES(updated_at)',[JSON.stringify(backup.appState),new Date().toISOString()]);
   }else await connection.execute('DELETE FROM app_state');
   if(backup.historicalReports){
    await connection.execute('DELETE FROM historical_reports');
    for(const report of backup.historicalReports)await connection.execute('INSERT INTO historical_reports (id,file_name,period,bytes,uploaded_at,uploaded_by,sheet_names,content) VALUES (?,?,?,?,?,?,?,?)',[report.id,report.fileName,report.period,report.bytes,report.uploadedAt,report.uploadedBy,JSON.stringify(report.sheetNames),Buffer.from(report.base64,'base64')]);
   }
   await connection.execute('DELETE FROM auth_sessions');
   await connection.execute('DELETE FROM auth_limits');
   await connection.execute('DELETE FROM auth_audit');
   await connection.execute('DELETE FROM auth_users');
   for(const user of backup.users)await connection.execute('INSERT INTO auth_users (id,name,email,role,password_hash,active,created_at) VALUES (?,?,?,?,?,?,?)',[user.id,user.name,user.email,String(normalizeRole(user.role)),user.password_hash,user.active,user.created_at]);
   for(const entry of backup.audit)await connection.execute('INSERT INTO auth_audit (id,actor_id,action,target_id,created_at) VALUES (?,?,?,?,?)',[entry.id,entry.actor_id,entry.action,entry.target_id,entry.created_at]);
  });
  await audit(actor.id,'backup_restored');
  return startSession(request,{id:actor.id,name:actor.name,email:actor.email,role:actor.role});
 }catch(error){return authFailure(error)}
}
