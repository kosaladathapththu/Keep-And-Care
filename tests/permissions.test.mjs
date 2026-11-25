import assert from 'node:assert/strict';
import test from 'node:test';
import {roles,normalizeRole,hasFullAccess,canSection,canOperate,canEditField,canDeleteRecord,canReport,authorizeStateChange,visibleState} from '../app/permissions.ts';
const state={jobs:[],transactions:[],staff:[],customers:[],jobTypes:[],services:[],paymentMethods:[]};
test('GM and Assistant are separate selectable roles; legacy Assistant GM migrates to Assistant',()=>{
 assert.deepEqual(roles,['GM','Assistant','CFO','Developer']);
 assert.equal(normalizeRole('Assistant GM'),'Assistant');
});
for(const role of ['GM','Assistant','Developer'])test(role+' has full access to operations, finance, users, reports and state changes',()=>{
 assert.equal(hasFullAccess(role),true);
 for(const section of ['Overview','Jobs','New job','Customers','Staff','Finance','Reports','Settings','Users','Account'])assert.equal(canSection(role,section),true);
 assert.equal(canOperate(role),true);
 assert.equal(canEditField(role,'staff','salary'),true);
 assert.equal(canEditField(role,'job','paid'),true);
 assert.equal(canDeleteRecord(role,'transaction'),true);
 assert.equal(canReport(role,'Income Statement'),true);
 assert.equal(visibleState(state,role),state);
 const changed={...state,jobTypes:['New service type']};
 assert.deepEqual(authorizeStateChange(state,changed,role),changed);
});
test('CFO keeps finance access without user management or operational editing',()=>{
 assert.equal(hasFullAccess('CFO'),false);
 assert.equal(canSection('CFO','Users'),false);
 assert.equal(canOperate('CFO'),false);
 assert.equal(canEditField('CFO','job','paid'),true);
 assert.equal(canEditField('CFO','job','service'),false);
 assert.throws(()=>authorizeStateChange(state,{...state,jobTypes:['Changed']},'CFO'));
});
