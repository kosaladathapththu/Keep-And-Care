import assert from 'node:assert/strict';
import test from 'node:test';
import {databaseSettings,databaseFailureMessage} from '../lib/database-config.ts';
import {validWriteOrigin,secureSessionCookie} from '../lib/request-security.ts';
test('database configuration validates ports and bounded connection pools',()=>{
 const env={DB_HOST:'127.0.0.1',DB_USER:'app',DB_NAME:'knc'};
 assert.equal(databaseSettings(env).port,3306);
 assert.equal(databaseSettings(env).connectionLimit,5);
 assert.throws(()=>databaseSettings({...env,DB_PORT:'0'}));
 assert.throws(()=>databaseSettings({...env,DB_CONNECTION_LIMIT:'1000'}));
 assert.throws(()=>databaseSettings({...env,DB_NAME:''}));
});
test('database errors explain rejected credentials without leaking server errors',()=>{
 assert.match(databaseFailureMessage({code:'ER_ACCESS_DENIED_ERROR',message:'secret'}),/rejected/);
 assert.ok(!databaseFailureMessage({message:'secret'}).includes('secret'));
});
test('HTTPS hosting behind Passenger accepts only canonical browser origin and secures cookies',()=>{
 const request=new Request('http://internal:3000/api/state',{headers:{origin:'https://knc.supuncompanies.com'}});
 assert.equal(validWriteOrigin(request,'https://knc.supuncompanies.com'),true);
 assert.equal(secureSessionCookie(request,'https://knc.supuncompanies.com'),true);
 assert.equal(validWriteOrigin(request,'https://attacker.example'),false);
 assert.equal(validWriteOrigin(new Request('http://internal/api/state'),'https://knc.supuncompanies.com'),false);
});
