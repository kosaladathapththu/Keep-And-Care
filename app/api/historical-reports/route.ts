import {generateWorkbookReports} from '../../workbook-reports';
﻿import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { audit,authFailure,AuthError,json,rateLimit,readObject,requireUser } from '../../../lib/auth';
import { executeSql,queryRows,withTransaction } from '../../../lib/database';
import { validWriteOrigin } from '../../../lib/request-security';
import { canFinance } from '../../permissions';
import { maxWorkbookBytes,readHistoricalWorkbook,validPeriod } from '../../history-model';

type Row=RowDataPacket&{id:string;file_name:string;period:string;bytes:number;uploaded_at:string;uploaded_by:string;sheet_names:string;content:Buffer};
async function authorize(request:Request,write=false){const user=await requireUser(request);if(!canFinance(user.role))throw new AuthError('Access denied.',403);if(write&&!validWriteOrigin(request,process.env.APP_URL))throw new AuthError('Invalid request origin.',403);return user}
const metadata=(row:Row)=>({id:row.id,fileName:row.file_name,period:row.period,bytes:row.bytes,uploadedAt:row.uploaded_at,uploadedBy:row.uploaded_by,sheetNames:JSON.parse(row.sheet_names)});
export async function GET(request:Request){try{
 await authorize(request);const url=new URL(request.url),id=url.searchParams.get('id');
 if(!id){const rows=await queryRows<Row>('SELECT id,file_name,period,bytes,uploaded_at,uploaded_by,sheet_names FROM historical_reports ORDER BY period DESC,uploaded_at DESC');return json({reports:rows.map(metadata)})}
 if(!/^[a-f0-9]{64}$/.test(id))throw new AuthError('Invalid report identifier.');
 const [row]=await queryRows<Row>('SELECT * FROM historical_reports WHERE id=?',[id]);if(!row)throw new AuthError('Report not found.',404);
 if(url.searchParams.get('generated')==='1'){const preview=await readHistoricalWorkbook(new Uint8Array(row.content),row.file_name);return json({...metadata(row),...generateWorkbookReports(preview,row.period)})}
 if(url.searchParams.get('preview')==='1')return json({...metadata(row),...await readHistoricalWorkbook(new Uint8Array(row.content),row.file_name)});
 return new Response(new Uint8Array(row.content),{headers:{'content-type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','content-disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(row.file_name),'cache-control':'no-store, private','x-content-type-options':'nosniff'}});
 }catch(error){return authFailure(error)}}
export async function POST(request:Request){try{
 const user=await authorize(request,true);await rateLimit(request,'historical-upload:'+user.id,30);
 if(Number(request.headers.get('content-length')||0)>21*1024*1024)throw new AuthError('Upload up to 20 MB at a time.',413);
 const form=await request.formData(),files=form.getAll('files'),periods=JSON.parse(String(form.get('periods')||'[]')) as unknown;
 if(!files.length||files.length>10||!Array.isArray(periods)||periods.length!==files.length)throw new AuthError('Choose up to 10 workbooks and a month for each.');
 const prepared: {id:string;name:string;period:string;content:Buffer;sheets:string[]}[]=[];let total=0;
 for(let index=0;index<files.length;index++){
  const file=files[index];if(!(file instanceof File)||!validPeriod(periods[index]))throw new AuthError('Choose a valid month and year for every workbook.');
  total+=file.size;if(file.size>maxWorkbookBytes||total>20*1024*1024)throw new AuthError('Maximum 5 MB per workbook and 20 MB per upload.',413);
  const name=file.name.replace(/[\x00-\x1f\\/]/g,'_').slice(0,180);const content=Buffer.from(await file.arrayBuffer());
  let preview;try{preview=await readHistoricalWorkbook(new Uint8Array(content),name)}catch(error){throw new AuthError(name+': '+(error instanceof Error?error.message:'Invalid workbook.'))}
  prepared.push({id:createHash('sha256').update(content).digest('hex'),name,period:String(periods[index]),content,sheets:preview.sheets.map(sheet=>sheet.name)});
 }
 let added=0;const now=new Date().toISOString();
 await withTransaction(async connection=>{for(const item of prepared){const [result]=await connection.execute<import('mysql2/promise').ResultSetHeader>('INSERT IGNORE INTO historical_reports (id,file_name,period,bytes,uploaded_at,uploaded_by,sheet_names,content) VALUES (?,?,?,?,?,?,?,?)',[item.id,item.name,item.period,item.content.length,now,user.id,JSON.stringify(item.sheets),item.content]);added+=result.affectedRows}});
 await audit(user.id,'historical_reports_uploaded');return json({added,duplicates:prepared.length-added},201);
 }catch(error){if(error instanceof SyntaxError)return json({error:'Invalid upload details.'},400);return authFailure(error)}}
export async function PATCH(request:Request){try{const user=await authorize(request,true);const {id,period}=await readObject(request);if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)||!validPeriod(period))throw new AuthError('Choose a valid report and month.');const result=await executeSql('UPDATE historical_reports SET period=? WHERE id=?',[period,id]);if(!result.affectedRows)throw new AuthError('Report not found.',404);await audit(user.id,'historical_report_month_updated');return json({ok:true})}catch(error){return authFailure(error)}}
export async function DELETE(request:Request){try{const user=await authorize(request,true);const id=new URL(request.url).searchParams.get('id');if(!id||!/^[a-f0-9]{64}$/.test(id))throw new AuthError('Choose a report.');const result=await executeSql('DELETE FROM historical_reports WHERE id=?',[id]);if(!result.affectedRows)throw new AuthError('Report not found.',404);await audit(user.id,'historical_report_deleted');return json({ok:true})}catch(error){return authFailure(error)}}
