import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import {readHistoricalWorkbook} from '../app/history-model.ts';
import {generateWorkbookReports} from '../app/workbook-reports.ts';
import {filterReportState,reportRecordDate,availableReportMonths} from '../app/report-filters.ts';
import {createReportFile} from '../app/report-downloads.ts';
const sheet=(name,rows)=>({name,columns:['A','B','C','D','E','F','G'],rows:rows.map(([number,...cells])=>({number,cells}))});
test('generated cash flow includes merged dates and later rows, separates opening and flags incorrect source totals',async()=>{
 const workbook=new ExcelJS.Workbook(),s=workbook.addWorksheet('CASH FLOW');s.addRow(['MONTH :- OCTOBER','YEAR :- 2026']);s.getRow(6).values=['DATE','JOB NUMBER','DESCRIPTION','CASH IN','CASH OUT','BALANCE'];s.getRow(7).values=[new Date('2026-10-01'),'','OPENIN BALANCE',100,0,100];s.getRow(8).values=[new Date('2026-10-02'),1,'Service',50,0,150];s.getRow(9).values=[null,1,'Transport',0,20,130];s.mergeCells('A8:A9');s.getRow(10).values=[null,null,'TOTAL',150,0];
 const preview=await readHistoricalWorkbook(new Uint8Array(await workbook.xlsx.writeBuffer()),'October 2026.xlsx');const result=generateWorkbookReports(preview,'2026-10');const report=result.reports.find(r=>r.name==='Cash Flow Statement');
 assert.deepEqual(report.rows.at(-1),['','TOTAL','Opening excluded from receipts',50,20,130]);assert.equal(report.rows.length,5);assert.equal(report.review,true);assert.ok(report.notes.some(n=>n.includes('Source TOTAL')));
 assert.equal(result.reports.some(r=>r.name==='Income & Expense Report'),false,'Cash receipts alone do not establish job-costing income.');
});
test('trial balance retains actual imbalance and flags a mismatched date heading',()=>{
 const book={sheets:[sheet('TB',[[1,'As at 30.09.2026'],[5,'ACCOUNT','DEBIT (Rs.)','CREDIT (Rs.)'],[7,'Cash',200,0],[8,'Capital',0,150],[9,'TOTAL',200,150]])],suggestedPeriod:'2026-10',warnings:[]};
 const report=generateWorkbookReports(book,'2026-10').reports[0];assert.deepEqual(report.rows.at(-1),['TOTAL',200,150]);assert.ok(report.notes.some(n=>n.includes('difference 50.00')));assert.ok(report.notes.some(n=>n.includes('30.09.2026')));
});
test('unknown workbook layouts produce no invented reports',()=>{
 const result=generateWorkbookReports({sheets:[sheet('Notes',[[1,'Hello']])],suggestedPeriod:'',warnings:[]},'2026-10');assert.equal(result.reports.length,0);assert.ok(result.warnings.length);
});
test('live month filter uses full dates and keeps earlier receivables without inventing missing years',()=>{
 const job=(id,date)=>({id,date,customer:id,type:'Outside',service:'Test',technician:'Test',total:100,paid:0,status:'Awaiting payment'});
 const data={jobs:[job('old','2026-09-12'),job('current','25 Nov 2026, 14:00'),job('undated','26 Sep, 9:30 AM')],transactions:[{id:'a',date:'2026-09-01',kind:'Income',amount:10},{id:'b',date:'2026-11-03',kind:'Income',amount:20}],staff:[],jobTypes:[],services:[],paymentMethods:[]};
 assert.deepEqual(availableReportMonths(data),['2026-11','2026-09']);assert.equal(reportRecordDate('26 Sep, 9:30 AM'),'');
 assert.deepEqual(filterReportState(data,'2026-11','Jobs Register').data.jobs.map(j=>j.id),['current']);assert.deepEqual(filterReportState(data,'2026-11','Outstanding Customer Balances').data.jobs.map(j=>j.id),['old','current']);assert.equal(filterReportState(data,'2026-11','Cash Flow Statement').data.transactions.length,1);
});
test('download metadata retains source, reporting month and reconciliation notes',async()=>{
 const rows=[['Account','Amount'],['Cash',100]],notes=['Historical source balance needs review.'];const options={period:'October 2026',source:'October.xlsx',notes,generatedAt:'2026-11-25T00:00:00Z'};
 const json=await createReportFile('json','Trial Balance',rows,options),parsed=JSON.parse(new TextDecoder().decode(json.bytes));assert.equal(parsed.period,'October 2026');assert.equal(parsed.source,'October.xlsx');assert.deepEqual(parsed.notes,notes);
 const excel=await createReportFile('excel','Trial Balance',rows,options),workbook=new ExcelJS.Workbook();await workbook.xlsx.load(excel.bytes);assert.match(workbook.worksheets[0].getCell('A3').text,/October 2026/);assert.ok(workbook.worksheets[0].getColumn(1).values.includes(notes[0]));
});

test('job costing, payroll and receivable reports use detail totals without double counting summaries or guessing receipts',()=>{
 const ac=sheet('AC REPAIR',[[8,'','JOB 01','JOB 02','TOTAL'],[9,'','KC','KC'],[10,'REVENUE'],[11,'NORMAL SERVICE',100,200,300],[18,'EXPENCES'],[20,'TRANSPORT',10,20,30],[22,'LABOUR / COMMISSION',5,5,10],[27,'PROFIT'],[32,'JOB NUMBER','DESCRIPTION'],[33,'JOB 01','Service one','','','','ALICE'],[34,'JOB 02','Service two','','','','BOB']]);
 const summary=sheet('SUMMERY',[[32,'TOTAL EXPENCES',40,0,40],[36,'SUPUN RESIDENCY PAYRALL'],[37,'ALICE',50,0,50],[42,'TOTAL PAYRALL',50,0,50]]);
 const receivables=sheet('OUTSTANDING FROM SUPUN CENTER',[[3,'DATE','JOB DESCRIPTION','ATTEND PERSON','LOCATION','CUSTOMER NAME','INCOME','TOTAL','RECEIVED','PENDING BALANCE'],[15,'TOTAL COLLECTION FOR JULY','','','','','',100,40,60]]);
 const result=generateWorkbookReports({sheets:[ac,summary,receivables],suggestedPeriod:'2026-10',warnings:[]},'2026-10');
 const income=result.reports.find(r=>r.name==='Income & Expense Report');assert.deepEqual(income.rows.at(-2),['TOTAL',300,90]);assert.deepEqual(income.rows.at(-1),['NET RESULT',210,'']);
 const jobs=result.reports.find(r=>r.name==='Jobs Register');assert.equal(jobs.rows.length,4);assert.deepEqual(jobs.rows.at(-1).slice(5,7),[300,40]);assert.ok(!jobs.rows[0].some(cell=>/received|paid/i.test(String(cell))),'No per-job receipts are fabricated.');
 assert.deepEqual(result.reports.find(r=>r.name==='Outstanding Customer Balances').rows.at(-1),['TOTAL','',100,40,60]);
 assert.deepEqual(result.reports.find(r=>r.name==='Staff Salary & Commission Report').rows.at(-1),['TOTAL',50,0]);
});
