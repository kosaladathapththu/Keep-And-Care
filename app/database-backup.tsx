'use client';
import { useRef,useState,type ChangeEvent } from 'react';
import { Icon } from './icons';

export default function DatabaseBackup(){
 const fileRef=useRef<HTMLInputElement>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');

 async function download(){
  if(busy)return;
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/admin/backup',{cache:'no-store'});
   if(!response.ok){const result=await response.json() as {error?:string};throw Error(result.error||'Unable to download the backup.')}
   const blob=await response.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;
   link.download=response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1]||'keep-and-care-backup.json';
   link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   setMessage('Backup downloaded. Store it somewhere private and secure.');
  }catch(reason){setError(reason instanceof Error?reason.message:'Unable to download the backup.')}
  finally{setBusy(false)}
 }

 async function restore(event:ChangeEvent<HTMLInputElement>){
  const file=event.target.files?.[0];
  event.target.value='';
  if(!file||busy)return;
  if(file.size>20*1024*1024){setError('Backup file is too large (maximum 20 MB).');return}
  if(!window.confirm('Restoring replaces system records, user accounts, and audit history with the selected backup. Your active full-access account must be included. Continue?'))return;
  setBusy(true);setError('');setMessage('');
  try{
   const backup=JSON.parse(await file.text()) as unknown;
   const response=await fetch('/api/admin/backup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(backup)});
   const result=await response.json() as {error?:string};
   if(!response.ok)throw Error(result.error||'Unable to restore the backup.');
   window.location.reload();
  }catch(reason){setError(reason instanceof Error?reason.message:'Unable to restore the backup.')}
  finally{setBusy(false)}
 }

 return <section className="panel database-backup-panel"><div className="panel-head"><div><span className="section-kicker">DEVELOPER TOOLS</span><h2>System backup</h2><p>Download or restore jobs, finance records, settings, user accounts, historical workbooks, and audit history.</p></div><Icon name="download" size={22}/></div><div className="database-backup-actions"><button className="primary" type="button" onClick={()=>void download()} disabled={busy}><Icon name="download" size={17}/>{busy?'Please wait...':'Download backup'}</button><button className="outline" type="button" onClick={()=>fileRef.current?.click()} disabled={busy}><Icon name="upload" size={17}/>Restore backup</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={event=>void restore(event)}/></div><p className="database-backup-warning">Backup files contain confidential business records and password hashes. Keep them private. Restore replaces current records and signs all users out. Older backups without historical workbooks preserve existing uploads. For backups above 20 MB, use a full cPanel database backup.</p>{message&&<p role="status" className="account-notice">{message}</p>}{error&&<p role="alert" className="form-error">{error}</p>}</section>
}
