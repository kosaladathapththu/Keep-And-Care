import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import {hashPassword} from '../lib/passwords.ts';
const root=process.cwd(),stage=readFileSync('work/latest-hosting-stage.txt','utf8');
const local=parseEnv(readFileSync('.env.local','utf8'));
assert.equal(local.DB_NAME,'keepcare_dev','Integration test must use the dedicated local database.');
const env={...process.env,...local,NODE_ENV:'production',PORT:'3108',APP_URL:'https://knc.supuncompanies.com',AUTH_SETUP_TOKEN:'integration-no-account-setup'};
const connection=await mysql.createConnection({host:local.DB_HOST,port:Number(local.DB_PORT),user:local.DB_USER,password:local.DB_PASSWORD,database:local.DB_NAME});
const child=spawn(process.execPath,['app.js'],{cwd:stage,env,stdio:['ignore','pipe','pipe']});let logs='';child.stdout.on('data',chunk=>logs+=chunk);child.stderr.on('data',chunk=>logs+=chunk);
const ids=[],reportIds=[];const origin='https://knc.supuncompanies.com',base='http://127.0.0.1:3108';let cookie='';
async function api(path,options={}){return fetch(base+path,{...options,headers:{origin,'x-forwarded-host':'knc.supuncompanies.com','x-forwarded-proto':'https',...(cookie?{cookie}:{}),...options.headers}})}
const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('CASH FLOW');sheet.addRow(['MONTH :- OCTOBER','YEAR :- 2026']);sheet.addRow(['Synthetic test report',randomUUID()]);sheet.addRow(['DATE','JOB NUMBER','DESCRIPTION','CASH IN','CASH OUT','BALANCE']);sheet.addRow([new Date('2026-10-01'),'1','Test service',150,0,150]);
const bytes=new Uint8Array(await book.xlsx.writeBuffer()),id=createHash('sha256').update(bytes).digest('hex');reportIds.push(id);
try{
 let ready=false;for(let n=0;n<80;n++){try{const r=await fetch(base+'/api/auth/session');if(r.ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.ok(ready,logs);
 for(const role of ['Developer','GM','CFO']){const userId=randomUUID();ids.push(userId);await connection.execute('INSERT INTO auth_users (id,name,email,role,password_hash,active,created_at) VALUES (?,?,?,?,?,1,?)',[userId,'Upload test '+role,'upload-'+userId+'@example.invalid',role,await hashPassword('Test-only-password-'+userId),new Date().toISOString()]);if(role==='GM'){
  const login=await api('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'upload-'+userId+'@example.invalid',password:'Test-only-password-'+userId})});assert.equal(login.status,200,await login.clone().text());cookie=login.headers.get('set-cookie').split(';')[0];
 }}
 let response=await fetch(base+'/api/historical-reports');assert.equal(response.status,401);
 const [before]=await connection.query('SELECT payload FROM app_state WHERE id=1');
 const form=()=>{const form=new FormData();form.append('files',new Blob([bytes]),'Synthetic October.xlsx');form.append('periods',JSON.stringify(['2026-10']));return form};
 response=await api('/api/historical-reports',{method:'POST',body:form(),headers:{origin:'https://invalid.example'}});assert.equal(response.status,403);
 response=await api('/api/historical-reports',{method:'POST',body:form()});assert.equal(response.status,201,await response.clone().text());assert.equal((await response.json()).added,1);
 response=await api('/api/historical-reports',{method:'POST',body:form()});assert.equal((await response.json()).duplicates,1);
 response=await api('/api/historical-reports');assert.ok((await response.json()).reports.some(report=>report.id===id));
 response=await api('/api/historical-reports?id='+id+'&preview=1');assert.equal(response.status,200,await response.clone().text());assert.equal((await response.json()).sheets[0].name,'CASH FLOW');
 response=await api('/api/historical-reports?id='+id+'&generated=1');assert.equal(response.status,200,await response.clone().text());const generated=await response.json();assert.equal(generated.reports[0].name,'Cash Flow Statement');assert.equal(generated.reports[0].rows.at(-1)[3],150);
 response=await api('/api/historical-reports?id='+id);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),bytes);
 response=await api('/api/historical-reports',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id,period:'2025-12'})});assert.equal(response.status,200);
 response=await api('/api/admin/backup');assert.equal(response.status,200,await response.clone().text());const backup=(await response.json()).backup;assert.ok(backup.historicalReports.some(report=>report.id===id&&report.period==='2025-12'));
 const [after]=await connection.query('SELECT payload FROM app_state WHERE id=1');assert.deepEqual(after,before,'Historical uploads must not change operational records.');
 response=await api('/api/historical-reports?id='+id,{method:'DELETE'});assert.equal(response.status,200);
 console.log('Production integration passed: authentication, origin protection, upload, duplicate detection, list, all-sheet preview, automatic report generation, byte-exact download, month edit, backup inclusion, delete, and unchanged business records.');
}finally{
 for(const id of reportIds)await connection.execute('DELETE FROM historical_reports WHERE id=?',[id]);
 for(const id of ids){await connection.execute('DELETE FROM auth_sessions WHERE user_id=?',[id]);await connection.execute('DELETE FROM auth_audit WHERE actor_id=?',[id]);await connection.execute('DELETE FROM auth_users WHERE id=?',[id]);}
 await connection.end();child.kill();process.chdir(root);
}
