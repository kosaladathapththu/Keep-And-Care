import { requireUser,sameOrigin,json,AuthError,authFailure } from '../../../lib/auth';
import { authorizeStateChange,visibleState } from '../../permissions';
import type { AppState } from '../../records';
import { env } from 'cloudflare:workers';

const seed = {
  jobs: [
    { id:'KC-0926-032', customer:'Supun Super Center', type:'Supun Super Center', service:'Normal service - 4 units', technician:'Himal & Shehan', date:'26 Sep, 9:30 AM', total:12000, paid:12000, status:'Completed' },
    { id:'KC-0926-031', customer:'Ms. Nadeesha Perera', type:'Outside Customers', service:'Full service - 2 units', technician:'Damith & Maduranga', date:'26 Sep, 11:00 AM', total:10000, paid:6000, status:'Awaiting payment' },
    { id:'KC-0926-030', customer:'Manju Dew - Kohuwala', type:'Manju Dew', service:'Normal service', technician:'Maduranga', date:'26 Sep, 1:30 PM', total:3000, paid:0, status:'In progress' },
    { id:'KC-0926-029', customer:'Mr. Wasantha', type:'Outside Customers', service:'AC installation', technician:'Damith & Naveen', date:'27 Sep, 8:00 AM', total:10000, paid:0, status:'New' }
  ],
  transactions: [
    {id:'TR-101',date:'2026-09-26',description:'Service collections',category:'Service income',kind:'Income',method:'Cash',amount:251950},
    {id:'TR-102',date:'2026-09-26',description:'Technician travel',category:'Transport',kind:'Expense',method:'Cash',amount:50246},
    {id:'TR-103',date:'2026-09-26',description:'Meals during service calls',category:'Meals',kind:'Expense',method:'Cash',amount:7620},
    {id:'TR-104',date:'2026-09-26',description:'Tools and materials',category:'Tools & materials',kind:'Expense',method:'Bank transfer',amount:38950},
    {id:'TR-105',date:'2026-09-26',description:'Technician commissions',category:'Commission',kind:'Expense',method:'Cash',amount:23325}
  ],
  staff: [
    {id:'ST-001',name:'Damith Gayantha',role:'Technician',phone:'',salary:0,advances:0,commission:4325},
    {id:'ST-002',name:'Shehan Maduranga',role:'Technician',phone:'',salary:0,advances:0,commission:3000},
    {id:'ST-003',name:'Himal Shehan',role:'Technician',phone:'',salary:0,advances:0,commission:1500},
    {id:'ST-004',name:'Bhagya Fernando',role:'Operations Assistant',phone:'',salary:0,advances:0,commission:0}
  ],
  jobTypes:['Supun Super Center','Outside Customers','Manju Dew'],
  services:[{name:'AC-01 Normal service',price:3000},{name:'AC-02 Full service',price:2750},{name:'AC-03 Maintenance service',price:2500},{name:'Installation',price:10000},{name:'Repair / breakdown',price:3000},{name:'Gas charge',price:2500}],
  paymentMethods:['Cash','Bank transfer','Cheque','Card / online']
};

async function ensureState(){
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL)').run();
  const row=await env.DB.prepare('SELECT payload FROM app_state WHERE id = 1').first<{payload:string}>();
  if(!row){await env.DB.prepare('INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)').bind(JSON.stringify(seed),new Date().toISOString()).run();return seed}
  return JSON.parse(row.payload);
}

export async function GET(request:Request){try{const user=await requireUser(request);return json(visibleState(await ensureState() as AppState,user.role))}catch(error){return authFailure(error)}}
export async function PUT(request:Request){try{sameOrigin(request);const user=await requireUser(request);if(Number(request.headers.get('content-length')||0)>2_000_000)throw new AuthError('Application update is too large.',413);const value=await request.json() as AppState;if(!value||!Array.isArray(value.jobs)||!Array.isArray(value.transactions))throw new AuthError('Invalid application state');const current=await ensureState() as AppState;let next:AppState;try{next=authorizeStateChange(current,value,user.role)}catch(error){throw new AuthError(error instanceof Error?error.message:'Access denied.',403)}const result=await env.DB.prepare('UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 1 AND payload = ?').bind(JSON.stringify(next),new Date().toISOString(),JSON.stringify(current)).run();if(!result.meta.changes)throw new AuthError('Records changed in another session. Reload before saving.',409);return json({ok:true})}catch(error){return authFailure(error)}}
