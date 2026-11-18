import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { unzipSync } from 'fflate';
import { createReportFile, createAllReportsZip, reportNames } from '../app/report-downloads.ts';

const rows=[['Description','Amount'],...Array.from({length:100},(_,i)=>['Record '+i,i+.25])];
test('all report formats include all rows and valid file contents',async()=>{
 for(const name of reportNames){
  const json=await createReportFile('json',name,rows);
  assert.deepEqual(JSON.parse(new TextDecoder().decode(json.bytes)).rows,rows);
  const csv=await createReportFile('csv',name,rows);
  assert.ok(new TextDecoder().decode(csv.bytes).includes('"Record 99","99.25"'));
  const excel=await createReportFile('excel',name,rows);
  assert.ok(excel.name.endsWith('.xlsx'));
  const book=new ExcelJS.Workbook();await book.xlsx.load(excel.bytes);
  assert.equal(book.worksheets[0].getRow(105).getCell(2).value,99.25);
  const pdf=await createReportFile('pdf',name,rows);
  const text=new TextDecoder().decode(pdf.bytes);
  assert.ok(text.startsWith('%PDF-'));assert.ok(text.includes('Record 99'));
  assert.ok((text.match(/\/Type \/Page\b/g)||[]).length>1);
 }
});
test('CSV escapes quoted text and formula-like customer input',async()=>{
 const file=await createReportFile('csv','Test',[['Name'],['A, "B"\nC'],['=1+1'],[-5]]);
 const text=new TextDecoder().decode(file.bytes);
 assert.ok(text.includes('"A, ""B""\nC"'));assert.ok(text.includes('"\'=1+1"'));assert.ok(text.includes('"-5"'));
});
test('ZIP contains every report for each supported format',async()=>{
 for(const format of ['pdf','excel','csv','json']){
  const file=await createAllReportsZip(format,reportNames.map(name=>({name,rows})));
  const entries=unzipSync(file.bytes);assert.equal(Object.keys(entries).length,reportNames.length);
  for(const bytes of Object.values(entries))assert.ok(bytes.length>0);
 }
});

test('standard report output preserves snapshot time, A4 orientation and money formatting',async()=>{
 const generatedAt='2026-11-17T04:00:00.000Z';
 const rows=[['Account','Debit (Rs.)','Credit (Rs.)'],['Cash',10.25,0],['Income',0,10.25],['TOTAL',10.25,10.25]];
 const json=await createReportFile('json','Trial Balance',rows,{generatedAt});
 const metadata=JSON.parse(new TextDecoder().decode(json.bytes));assert.equal(metadata.generatedAt,generatedAt);assert.equal(metadata.currency,'LKR');assert.ok(metadata.notes[0].includes('Cash-basis'));
 const excel=await createReportFile('excel','Trial Balance',rows,{generatedAt});const book=new ExcelJS.Workbook();await book.xlsx.load(excel.bytes);const sheet=book.worksheets[0];assert.equal(sheet.pageSetup.paperSize,9);assert.equal(sheet.pageSetup.orientation,'portrait');assert.equal(sheet.pageSetup.printTitlesRow,'1:5');assert.equal(sheet.getRow(6).getCell(2).numFmt,'#,##0.00;[Red](#,##0.00)');assert.equal(sheet.getRow(8).getCell(1).font.bold,true);assert.equal(book.created.toISOString(),generatedAt);
 const pdf=await createReportFile('pdf','Trial Balance',rows,{generatedAt});const text=new TextDecoder().decode(pdf.bytes);assert.ok(text.includes('Page 1 of 1'));assert.ok(text.includes('10.25'));assert.ok(text.includes('Cash-basis'));const size=text.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);assert.ok(size);assert.ok(Number(size[2])>Number(size[1]));
});
