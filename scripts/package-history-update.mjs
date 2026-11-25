import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {zipSync,strToU8} from 'fflate';
const stage=readFileSync('work/latest-hosting-stage.txt','utf8'),files={};
function collect(folder){for(const item of readdirSync(folder,{withFileTypes:true})){const path=join(folder,item.name);if(item.isDirectory())collect(path);else files[relative(stage,path).replaceAll('\\','/')]=readFileSync(path)}}
collect(join(stage,'dist'));collect(join(stage,'public'));
files['database/migrations/2026-11-historical-reports.sql']=readFileSync('database/migrations/2026-11-historical-reports.sql');
files['HISTORY_UPDATE_README.md']=strToU8(readFileSync('HISTORY_UPDATE_README.md','utf8'));
writeFileSync('Keep-And-Care-History-Update.zip',zipSync(files,{level:6}));
console.log('Created Keep-And-Care-History-Update.zip with '+Object.keys(files).length+' application files, migration and instructions. No customer workbooks or secrets included.');
