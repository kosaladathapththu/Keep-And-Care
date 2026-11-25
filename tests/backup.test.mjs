import assert from 'node:assert/strict';
import test from 'node:test';
import { isSystemBackup } from '../lib/backup.ts';

const developerId='developer-1';
const validBackup=()=>({
 format:'keep-care-system-backup',
 version:1,
 createdAt:'2026-11-18T00:00:00.000Z',
 appState:{jobs:[],transactions:[],staff:[],jobTypes:[],services:[],paymentMethods:[]},
 users:[{id:developerId,name:'Developer',email:'developer@example.com',role:'Developer',password_hash:'scrypt:16384:8:5:0123456789abcdef0123456789abcdef:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',active:1,created_at:'2026-11-18T00:00:00.000Z'}],
 audit:[]
});

test('accepts a complete backup containing the active Developer account',()=>{
 assert.equal(isSystemBackup(validBackup(),developerId),true);
});

test('rejects backups that would remove the active Developer account',()=>{
 const backup=validBackup();
 backup.users[0].active=0;
 assert.equal(isSystemBackup(backup,developerId),false);
});

test('rejects unsupported, duplicate, or malformed backup contents',()=>{
 const unsupported=validBackup();
 unsupported.version=2;
 assert.equal(isSystemBackup(unsupported,developerId),false);
 const duplicate=validBackup();
 duplicate.users.push({...duplicate.users[0],id:'developer-2'});
 assert.equal(isSystemBackup(duplicate,developerId),false);
 const malformed=validBackup();
 malformed.users[0].password_hash='plaintext';
 assert.equal(isSystemBackup(malformed,developerId),false);
});
