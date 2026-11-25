import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import {cellDisplay,readHistoricalWorkbook,suggestWorkbookPeriod,validPeriod} from '../app/history-model.ts';
import {validHistoricalBackups} from '../lib/historical-backup.ts';
async function fixture(){const book=new ExcelJS.Workbook();const sheet=book.addWorksheet('CASH FLOW');sheet.getCell('B4').value='MONTH :- OCTOBER';sheet.getCell('E4').value='YEAR :- 2026';sheet.getCell('B6').value='DATE';sheet.getCell('E6').value='CASH IN';sheet.getCell('B7').value=new Date('2026-10-01T00:00:00Z');sheet.getCell('E7').value={formula:'100+50',result:150};sheet.mergeCells('B1:C1');sheet.getCell('B1').value='KEEP & CARE';const details=book.addWorksheet('OUTSTANDING');details.getCell('A1').value='Previous months';details.getCell('A2').value={formula:"'[other.xlsx]Sheet'!A1"};return new Uint8Array(await book.xlsx.writeBuffer())}
test('historical preview preserves dates, cached formulas and all sheets without repeating merged cells',async()=>{
 const preview=await readHistoricalWorkbook(await fixture(),'October.xlsx');
 assert.equal(preview.suggestedPeriod,'2026-10');assert.equal(preview.sheets.length,2);
 const sheet=preview.sheets[0];assert.equal(sheet.rows.find(row=>row.number===1).cells.filter(Boolean).length,1);
 assert.equal(sheet.rows.find(row=>row.number===7).cells[1],'2026-10-01');assert.equal(sheet.rows.find(row=>row.number===7).cells[4],150);
 assert.ok(preview.warnings.some(w=>w.includes('no saved result')));
});
test('workbook selection rejects other file formats, corrupt files and invalid periods',async()=>{
 await assert.rejects(readHistoricalWorkbook(new Uint8Array([1,2]),'bad.csv'),/xlsx/);
 await assert.rejects(readHistoricalWorkbook(new Uint8Array([1,2]),'bad.xlsx'),/invalid/);
 assert.equal(validPeriod('2026-13'),false);assert.equal(validPeriod('2026-10'),true);assert.equal(validPeriod('2026-1'),false);
});
test('month detection does not invent a missing year and handles many years',()=>{
 assert.equal(suggestWorkbookPeriod('December 2025.xlsx',[]),'2025-12');assert.equal(suggestWorkbookPeriod('January 2026.xlsx',[]),'2026-01');assert.equal(suggestWorkbookPeriod('October.xlsx',[]),'');
 assert.equal(cellDisplay({formula:'1/0',result:{error:'#DIV/0!'}}),'#DIV/0!');assert.equal(cellDisplay({text:'Link',hyperlink:'https://example.com'}),'Link');
});
test('archive backup validation rejects duplicate file IDs and mismatched file sizes',()=>{
 const item={id:'a'.repeat(64),fileName:'October.xlsx',period:'2026-10',bytes:4,uploadedAt:'2026-11-25T00:00:00Z',uploadedBy:'tester',sheetNames:['CASH FLOW'],base64:'UEsDBA=='};
 assert.equal(validHistoricalBackups([item]),true);assert.equal(validHistoricalBackups([item,item]),false);assert.equal(validHistoricalBackups([{...item,bytes:100}]),false);assert.equal(validHistoricalBackups([{...item,fileName:'../file.xlsx'}]),false);
});
