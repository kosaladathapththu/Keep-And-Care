import type { CellValue } from 'exceljs';
import { reportNotes,isReportTotal } from './report-model.ts';
export type ReportFormat = 'excel'|'pdf'|'csv'|'json';
export type ReportRows = (string|number)[][];
export type ReportOptions={generatedAt?:string;period?:string;source?:string;notes?:string[]};
export type ReportFile={name:string;type:string;bytes:Uint8Array};
export const reportNames = ['Trial Balance','Cash Flow Statement','Income & Expense Report','Outstanding Customer Balances','Staff Salary & Commission Report','Jobs Register'];
const slug = (name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const csvCell = (value:string|number)=>'"'+String(typeof value==='string'&&/^[\s]*[=+@-]/.test(value)?"'"+value:value).replaceAll('"','""')+'"';
export async function createReportFile(format:ReportFormat,name:string,rows:ReportRows,options:ReportOptions={}):Promise<ReportFile>{
 const filename=slug(name)+(options.period&&options.period!=='All recorded entries'?'-'+slug(options.period):''),generatedAt=options.generatedAt?new Date(options.generatedAt):new Date(),notes=options.notes||reportNotes(name),headers=rows[0]||[];
 const period=options.period||'All recorded entries',source=options.source||'System records';
 const generatedLabel=generatedAt.toLocaleString('en-LK',{timeZone:'Asia/Colombo'});
 if(format==='json')return {name:filename+'.json',type:'application/json',bytes:new TextEncoder().encode(JSON.stringify({company:'Supun Group of Companies',report:name,period,source,currency:'LKR',generatedAt:generatedAt.toISOString(),notes,rows},null,2))};
 if(format==='csv')return {name:filename+'.csv',type:'text/csv;charset=utf-8',bytes:new TextEncoder().encode('\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'))};
 if(format==='excel'){
  const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();book.creator='Keep & Care';book.created=generatedAt;
  const sheet=book.addWorksheet('Report');sheet.addRow(['Supun Group of Companies']);sheet.addRow([name]);sheet.addRow([period+' | '+source+' | Currency: LKR | Generated '+generatedLabel]);sheet.addRow([notes.join(' ')]);sheet.addRows(rows as CellValue[][]);
  for(let row=1;row<=4;row++)if(headers.length>1)sheet.mergeCells(row,1,row,headers.length);
  sheet.getRow(1).font={bold:true,size:18,color:{argb:'FF174C38'}};sheet.getRow(2).font={bold:true,size:14};sheet.getRow(3).font={size:10,color:{argb:'FF667766'}};sheet.getRow(4).font={size:9,color:{argb:'FF667766'}};sheet.getRow(4).alignment={wrapText:true,vertical:'middle'};sheet.getRow(4).height=40;sheet.getRow(5).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(5).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF174C38'}};sheet.getRow(5).alignment={wrapText:true,vertical:'middle'};sheet.getRow(5).height=32;
  sheet.columns.forEach((column,index)=>{column.width=Math.min(42,rows.reduce((width,row)=>Math.max(width,String(row[index]??'').length+2),14));});
  sheet.views=[{state:'frozen',ySplit:5}];sheet.autoFilter={from:{row:5,column:1},to:{row:5,column:headers.length||1}};
  sheet.eachRow((row,index)=>{
   if(index<=5)return;
   row.alignment={vertical:'top',wrapText:true};
   row.eachCell((cell,column)=>{
    if(typeof cell.value==='number'){
     cell.numFmt=/Rs\.|LKR|Debit|Credit|^Amount$/i.test(String(headers[column-1]))?'#,##0.00;[Red](#,##0.00)':'#,##0';
     cell.alignment={horizontal:'right',vertical:'top'};
    }
   });
   if(isReportTotal(rows[index-5]||[])){
    row.font={bold:true,color:{argb:'FF174C38'}};
    row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEAF3E5'}};
    row.border={top:{style:'thin',color:{argb:'FFB7C9AB'}}};
   }
  });
  if(options.notes?.length){sheet.addRow([]);const title=sheet.addRow(['Notes & reconciliation']);title.font={bold:true};for(const note of notes){const row=sheet.addRow([note]);if(headers.length>1)sheet.mergeCells(row.number,1,row.number,headers.length);row.alignment={wrapText:true,vertical:'top'};row.height=Math.max(28,Math.ceil(note.length/Math.max(40,headers.length*15))*14)}}
  sheet.pageSetup={paperSize:9,orientation:headers.length>6?'landscape':'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:5',printArea:`A1:${sheet.getColumn(headers.length||1).letter}${sheet.rowCount}`,margins:{left:.3,right:.3,top:.5,bottom:.5,header:.2,footer:.2}};sheet.headerFooter={oddFooter:'&LKeep & Care | Supun Group of Companies&RPage &P of &N'};
  return {name:filename+'.xlsx',type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',bytes:new Uint8Array(await book.xlsx.writeBuffer())};
 }
 const [{jsPDF},{autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
 const doc=new jsPDF({orientation:headers.length>6?'landscape':'portrait',unit:'mm',format:'a4'}),width=doc.internal.pageSize.width,height=doc.internal.pageSize.height;
 doc.setProperties({title:name,author:'Keep & Care - Supun Group of Companies'});
 const columnStyles:Record<number,{halign:'right'}>={};headers.forEach((heading,index)=>{if(rows.slice(1).some(row=>typeof row[index]==='number'))columnStyles[index]={halign:'right'}});
 autoTable(doc,{head:[headers],body:rows.slice(1),startY:43,margin:{left:14,right:14,top:43,bottom:32},styles:{fontSize:headers.length>9?7:8.5,cellPadding:2.6,overflow:'linebreak',lineColor:[224,231,218],lineWidth:.1},headStyles:{fillColor:[23,76,56],fontSize:headers.length>9?7:8},alternateRowStyles:{fillColor:[248,250,245]},columnStyles,rowPageBreak:'avoid',didParseCell:cell=>{if(cell.section==='body'&&isReportTotal(rows[cell.row.index+1]||[])){cell.cell.styles.fillColor=[234,243,229];cell.cell.styles.fontStyle='bold';cell.cell.styles.textColor=[23,76,56]}if(cell.section==='body'&&typeof cell.cell.raw==='number'){cell.cell.text=[cell.cell.raw.toLocaleString('en-LK',{minimumFractionDigits:/Rs\.|LKR|Debit|Credit|^Amount$/i.test(String(headers[cell.column.index]))?2:0,maximumFractionDigits:2})]}},didDrawPage:()=>{doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(23,76,56);doc.text('SUPUN GROUP OF COMPANIES',14,13);doc.setFontSize(12);doc.setTextColor(30,45,35);doc.text(name,14,22);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,115,95);doc.text(doc.splitTextToSize('Keep & Care | '+period+' | '+source+' | LKR',width-28).slice(0,1),14,29);doc.text('Generated: '+generatedLabel,14,35);doc.setDrawColor(199,214,185);doc.line(14,38,width-14,38);doc.setFontSize(6.5);const lines=doc.splitTextToSize(notes.join(' '),width-28);doc.text(lines.slice(0,3),14,height-24)}});
 const noteLines=doc.splitTextToSize(notes.map(note=>'- '+note).join('\n\n'),width-28) as string[];if(noteLines.length>3){const linesPerPage=Math.floor((height-55)/4);for(let index=0;index<noteLines.length;index+=linesPerPage){doc.addPage();doc.setFontSize(13);doc.setTextColor(23,76,56);doc.text('Notes & reconciliation',14,18);doc.setFontSize(9);doc.setTextColor(45,55,45);doc.text(noteLines.slice(index,index+linesPerPage),14,28,{lineHeightFactor:1.25})}}
 const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setDrawColor(215,225,205);doc.line(14,height-11,width-14,height-11);doc.setFontSize(7);doc.setTextColor(110,125,100);doc.text('Keep & Care | Developed by Supun IT Solutions',14,height-7);doc.text(`Page ${page} of ${pages}`,width-14,height-7,{align:'right'})}
 return {name:filename+'.pdf',type:'application/pdf',bytes:new Uint8Array(doc.output('arraybuffer'))};
}
export function saveReportFile(file:ReportFile){const url=URL.createObjectURL(new Blob([new Uint8Array(file.bytes).buffer],{type:file.type}));const anchor=document.createElement('a');anchor.href=url;anchor.download=file.name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
export async function createAllReportsZip(format:ReportFormat,reports:{name:string;rows:ReportRows}[],options:ReportOptions={}){const {zipSync}=await import('fflate');const files:Record<string,Uint8Array>={};for(const report of reports){const file=await createReportFile(format,report.name,report.rows,options);files[file.name]=file.bytes}return {name:'keep-and-care-all-reports-'+(format==='excel'?'xlsx':format)+'.zip',type:'application/zip',bytes:zipSync(files)}}
