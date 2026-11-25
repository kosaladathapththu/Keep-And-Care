import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const stage=readFileSync('work/latest-hosting-stage.txt','utf8');
const local=parseEnv(readFileSync('.env.local','utf8'));
const env={...process.env,...local,NODE_ENV:'production',PORT:'3107',APP_URL:'https://knc.supuncompanies.com',AUTH_SETUP_TOKEN:'smoke-test-token-no-account-created'};
function walk(folder){return readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(folder,e.name)):[join(folder,e.name)])}
for(const file of walk(join(stage,'dist/client'))){const content=readFileSync(file);for(const key of ['DB_PASSWORD','DB_USER'])assert.ok(!content.includes(Buffer.from(local[key])),key+' leaked in client output');}
const child=spawn(process.execPath,['app.js'],{cwd:stage,env,stdio:['ignore','pipe','pipe']});let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
try{
 let ready=false;for(let attempt=0;attempt<80;attempt++){try{const r=await fetch('http://127.0.0.1:3107/api/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250));}
 assert.ok(ready,'Packaged startup failed: '+log);
 for(const path of ['/api/health','/api/auth/session','/login']){const r=await fetch('http://127.0.0.1:3107'+path,{headers:{'x-forwarded-host':'knc.supuncompanies.com','x-forwarded-proto':'https'}});assert.equal(r.status,200,path);if(path==='/api/auth/session'){const data=await r.json();assert.equal(data.setupRequired,true);assert.equal(data.localSetup,false);}console.log('Packaged production '+path+': HTTP '+r.status);}
 console.log('CommonJS startup + compiled ES modules passed. No database credentials in client assets. No account was created.');
}finally{child.kill();}
