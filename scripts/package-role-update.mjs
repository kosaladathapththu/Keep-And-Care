import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {zipSync,strToU8} from 'fflate';
const stage=readFileSync('work/latest-hosting-stage.txt','utf8');
const files={};
function collect(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){const path=join(folder,entry.name);if(entry.isDirectory())collect(path);else files[relative(stage,path).replaceAll('\\','/')]=readFileSync(path);}}
collect(join(stage,'dist'));collect(join(stage,'public'));
files['ROLE_UPDATE_README.md']=strToU8(readFileSync('ROLE_UPDATE_README.md','utf8'));
writeFileSync('Keep-And-Care-Roles-Update.zip',zipSync(files,{level:6}));
console.log('Created hosting update ZIP: '+Object.keys(files).length+' files; no environment, database, dependencies or .htaccess changes.');
