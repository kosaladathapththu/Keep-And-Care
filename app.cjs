'use strict';
// CommonJS entry for Passenger. The compiled application is loaded with import().
const { existsSync,readFileSync }=require('node:fs');
const { resolve }=require('node:path');
const { parseEnv }=require('node:util');
process.chdir(__dirname);
for(const file of process.env.NODE_ENV==='production'?['.env']:['.env.local','.env']){
 const path=resolve(__dirname,file);if(!existsSync(path))continue;
 for(const [key,value] of Object.entries(parseEnv(readFileSync(path,'utf8'))))if(process.env[key]===undefined)process.env[key]=value;
}
const start=(async()=>{
 const port=Number(process.env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535.');
 const entry=resolve(__dirname,'dist/server/index.js');if(!existsSync(entry))throw Error('Build output is missing. Extract the complete hosting package, including dist/server and dist/client.');
 if(process.env.NODE_ENV==='production'){
  for(const key of ['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','APP_URL'])if(!process.env[key])throw Error('Missing hosting environment variable: '+key);
  const url=new URL(process.env.APP_URL);if(url.protocol!=='https:')throw Error('Set APP_URL to the HTTPS website address.');
  process.env.VINEXT_TRUSTED_HOSTS ||= url.host;
 }
 const { startProdServer }=await import('vinext/server/prod-server');
 return startProdServer({port,host:process.env.HOST||'0.0.0.0',outDir:resolve(__dirname,'dist')});
})();
start.catch(error=>{console.error('[Keep & Care startup] '+error.message);process.exitCode=1});
module.exports=start;
