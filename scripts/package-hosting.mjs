import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,join} from 'node:path';
import {createHash} from 'node:crypto';
import {zipSync,strToU8} from 'fflate';
const root=process.cwd();
if(!existsSync(resolve(root,'dist/server/index.js')))throw Error('Run npm run build first.');
const stage=resolve(root,'work','hosting-'+Date.now());mkdirSync(stage,{recursive:true});
for(const folder of ['dist','public','database'])cpSync(resolve(root,folder),resolve(stage,folder),{recursive:true});
for(const file of ['app.cjs','package-lock.json','HOSTING_README.md'])cpSync(resolve(root,file),resolve(stage,file));
mkdirSync(resolve(stage,'scripts'),{recursive:true});cpSync(resolve(root,'scripts/check-database.mjs'),resolve(stage,'scripts/check-database.mjs'));
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
pkg.type='commonjs';pkg.scripts={start:'node app.js','db:check':'node scripts/check-database.mjs'};
writeFileSync(resolve(stage,'package.json'),JSON.stringify(pkg,null,2)+'\n');
writeFileSync(resolve(stage,'app.js'),"'use strict';\nmodule.exports = require('./app.cjs');\n");
writeFileSync(resolve(stage,'dist/package.json'),JSON.stringify({type:'module'})+'\n');
writeFileSync(resolve(stage,'hosting.env.example'),`NODE_ENV=production\nAPP_URL=https://knc.supuncompanies.com\nDB_HOST=localhost\nDB_PORT=3306\nDB_NAME=REPLACE_WITH_FULL_CPANEL_DATABASE_NAME\nDB_USER=REPLACE_WITH_FULL_CPANEL_DATABASE_USER\nDB_PASSWORD=REPLACE_WITH_PRIVATE_PASSWORD\nDB_CONNECTION_LIMIT=5\nAUTH_SETUP_TOKEN=REPLACE_WITH_PRIVATE_RANDOM_64_HEX_CHARACTER_VALUE\nVINEXT_TRUSTED_HOSTS=knc.supuncompanies.com\n`);
function walk(folder){return readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(folder,entry.name)):[join(folder,entry.name)])}
const files=walk(stage);const hashes={};const zip={};
for(const file of files){const name=relative(stage,file).replaceAll('\\','/');if(/(^|\/)(node_modules|\.env(?:\.|$)|\.git|stderr\.log)/.test(name))throw Error('Private or generated content in hosting package: '+name);const bytes=readFileSync(file);hashes[name]=createHash('sha256').update(bytes).digest('hex');zip[name]=bytes;}
const manifest={domain:'knc.supuncompanies.com',createdAt:new Date().toISOString(),node:pkg.engines.node,startup:'app.js',files:hashes};
writeFileSync(resolve(stage,'hosting-manifest.json'),JSON.stringify(manifest,null,2));zip['hosting-manifest.json']=strToU8(JSON.stringify(manifest,null,2));
const archive=resolve(root,'Keep-And-Care-knc-cPanel.zip');writeFileSync(archive,zipSync(zip,{level:6}));
writeFileSync(resolve(root,'work/latest-hosting-stage.txt'),stage);
console.log('Created '+archive+' ('+Object.keys(zip).length+' files).');console.log('No local environment files, database records or node_modules included.');
