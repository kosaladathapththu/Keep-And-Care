import type { CellValue } from 'exceljs';

export type HistoricalReport={id:string;fileName:string;period:string;bytes:number;uploadedAt:string;uploadedBy:string;sheetNames:string[]};
export type HistoricalSheet={name:string;columns:string[];inheritedDates?:{row:number;column:number;value:string}[];rows:{number:number;cells:(string|number)[]}[]};
export type WorkbookPreview={sheets:HistoricalSheet[];suggestedPeriod:string;warnings:string[]};
export const maxWorkbookBytes=5*1024*1024;
export function validPeriod(value:unknown):value is string{return typeof value==='string'&&/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(value)}
export function periodLabel(period:string){return validPeriod(period)?new Date(period+'-01T12:00:00Z').toLocaleDateString('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}):period}
export function cellDisplay(value:CellValue):string|number{
 if(value===null||value===undefined)return '';
 if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString().slice(0,10):'';
 if(typeof value==='number')return Number.isFinite(value)?value:'Invalid number';
 if(typeof value==='string')return value.slice(0,2000);
 if(typeof value==='boolean')return value?'TRUE':'FALSE';
 if('formula'in value||'sharedFormula'in value)return value.result===undefined?'[Formula: no saved result]':cellDisplay(value.result as CellValue);
 if('richText'in value)return value.richText.map(part=>part.text).join('').slice(0,2000);
 if('text'in value)return String(value.text).slice(0,2000);
 if('error'in value)return value.error;
 return '';
}
function columnName(index:number){let label='';for(let n=index;n>0;n=Math.floor((n-1)/26))label=String.fromCharCode(65+(n-1)%26)+label;return label}
export function suggestWorkbookPeriod(fileName:string,sheets:HistoricalSheet[]){
 const monthNames=['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];
 const priority=[...sheets].sort((a,b)=>Number(/CASH.?FLOW/i.test(b.name))-Number(/CASH.?FLOW/i.test(a.name)));
 const headers=priority.map(sheet=>sheet.rows.filter(row=>row.number<=8).map(row=>row.cells.join(' ')).join(' '));
 const year=(fileName.match(/\b((?:19|20|21)\d{2})\b/)||headers.map(h=>h.match(/YEAR\s*[:-]?\s*((?:19|20|21)\d{2})/i)).find(Boolean)||headers.map(h=>h.match(/\b((?:19|20|21)\d{2})\b/)).find(Boolean))?.[1];
 const month=monthNames.findIndex(month=>new RegExp('\\b'+month+'\\b','i').test(fileName));
 const headerMonth=monthNames.findIndex(month=>headers[0]&&new RegExp('\\b'+month+'\\b','i').test(headers[0]));
 const index=month>=0?month:headerMonth;
 return year&&index>=0?year+'-'+String(index+1).padStart(2,'0'):'';
}
export async function readHistoricalWorkbook(bytes:Uint8Array,fileName:string):Promise<WorkbookPreview>{
 if(!/\.xlsx$/i.test(fileName))throw Error('Choose an Excel .xlsx workbook.');
 if(!bytes.length||bytes.length>maxWorkbookBytes)throw Error('Each workbook must be between 1 byte and 5 MB.');
 const {unzipSync}=await import('fflate');let expanded=0,entries=0,hasWorkbook=false;
 try{unzipSync(bytes,{filter:entry=>{entries++;expanded+=entry.originalSize;if(entries>2000||expanded>32*1024*1024)throw Error('Workbook is too large when expanded.');if(entry.name==='xl/workbook.xml')hasWorkbook=true;return false}})}catch{throw Error('This workbook is invalid or exceeds the supported workbook size.');}
 if(!hasWorkbook)throw Error('The file is not a valid Excel workbook.');
 const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();
 await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
 if(workbook.worksheets.length>40)throw Error('A workbook may contain up to 40 sheets.');
 const warnings=new Set<string>(),sheets:HistoricalSheet[]=[];let cellCount=0;
 for(const sheet of workbook.worksheets){
  if(sheet.rowCount>10000||sheet.columnCount>150)throw Error('A sheet exceeds 10,000 rows or 150 columns.');
  const rows:HistoricalSheet['rows']=[],inheritedDates:NonNullable<HistoricalSheet['inheritedDates']>=[];let lastColumn=0;
  sheet.eachRow((row,number)=>{const cells:(string|number)[]=[];row.eachCell((cell,column)=>{
   if(cell.isMerged&&cell.master.address!==cell.address){const inherited=cellDisplay(cell.value);if(typeof inherited==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(inherited)){if(inheritedDates.length>=100000)throw Error('Too many merged date cells.');inheritedDates.push({row:number,column:column-1,value:inherited})}return;}
   const value=cellDisplay(cell.value);if(value==='')return;
   if(++cellCount>100000)throw Error('This workbook contains too many populated cells (maximum 100,000).');
   if(value==='[Formula: no saved result]')warnings.add('Some formulas have no saved result. Open and save the workbook in Excel to refresh them.');
   cells[column-1]=value;lastColumn=Math.max(lastColumn,column);
  });if(cells.length)rows.push({number,cells:Array.from(cells,value=>value??'')})});
  sheets.push({name:sheet.name,inheritedDates,columns:Array.from({length:lastColumn},(_,i)=>columnName(i+1)),rows});
 }
 if(!sheets.some(sheet=>sheet.rows.length))throw Error('This workbook has no visible cell content.');
 if(workbook.worksheets.some(sheet=>sheet.state!=='visible'))warnings.add('The workbook contains hidden sheets. All sheets are included in the historical preview.');
 warnings.add('Preview uses saved cell values. Formulas, linked workbooks and macros are not executed. Download the original file to retain its layout and formulas.');
 return {sheets,suggestedPeriod:suggestWorkbookPeriod(fileName,sheets),warnings:[...warnings]};
}
