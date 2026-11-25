import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname,resolve } from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),envFile=resolve(root,'.env.local');
if(existsSync(envFile))throw Error('.env.local already exists. It was not overwritten. Use npm run db:check to diagnose it.');
const host='127.0.0.1',port=Number(process.env.LOCAL_DB_PORT)||3306,database='keepcare_dev',user='kc_local_'+randomBytes(4).toString('hex'),password=randomBytes(24).toString('hex');
const admin=await mysql.createConnection({host,port,user:process.env.LOCAL_DB_ADMIN_USER||'root',password:process.env.LOCAL_DB_ADMIN_PASSWORD||'',multipleStatements:false});
try{
 await admin.query('CREATE DATABASE IF NOT EXISTS `keepcare_dev` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 await admin.query('CREATE USER ?@? IDENTIFIED BY ?',[user,'localhost',password]);
 await admin.query('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON `keepcare_dev`.* TO ?@?',[user,'localhost']);
 const application=await mysql.createConnection({host,port,user,password,database});
 try{for(const statement of readFileSync(resolve(root,'database/schema.mysql.sql'),'utf8').split(';').map(s=>s.trim()).filter(Boolean))await application.query(statement)}finally{await application.end()}
 writeFileSync(envFile,['# Local XAMPP configuration. Private; do not upload to cPanel.','DB_HOST='+host,'DB_PORT='+port,'DB_NAME='+database,'DB_USER='+user,'DB_PASSWORD='+password,'APP_URL=http://localhost:3000','DB_CONNECTION_LIMIT=5',''].join('\n'),{flag:'wx',mode:0o600});
 console.log('Created the local application database and a dedicated MySQL user.');console.log('Private settings saved to .env.local. Existing keep_and_care records were not changed.');console.log('Restart npm run dev, then open http://localhost:3000/login.');
}finally{await admin.end()}
