import { requireUser,sameOrigin,json,AuthError,authFailure } from '../../../lib/auth';
import { authorizeStateChange,visibleState } from '../../permissions';
import type { AppState } from '../../records';
import { ensureDatabase,executeSql,queryRows } from '../../../lib/database';

const seed = {
  jobs: [],
  transactions: [],
  staff: [],
  customers: [],
  jobTypes:['Supun Super Center','Outside Customers','Manju Dew'],
  services:[{name:'AC-01 Normal service',price:3000},{name:'AC-02 Full service',price:2750},{name:'AC-03 Maintenance service',price:2500},{name:'Installation',price:10000},{name:'Repair / breakdown',price:3000},{name:'Gas charge',price:2500}],
  paymentMethods:['Cash','Bank transfer','Cheque','Card / online']
};

async function ensureState(){
  await ensureDatabase();
  const [row]=await queryRows<{payload:string}&import('mysql2/promise').RowDataPacket>('SELECT payload FROM app_state WHERE id = 1');
  if(!row){await executeSql('INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)',[JSON.stringify(seed),new Date().toISOString()]);return seed}
  return JSON.parse(row.payload);
}

export async function GET(request:Request){try{const user=await requireUser(request);return json(visibleState(await ensureState() as AppState,user.role))}catch(error){return authFailure(error)}}
export async function PUT(request:Request){try{sameOrigin(request);const user=await requireUser(request);if(Number(request.headers.get('content-length')||0)>2_000_000)throw new AuthError('Application update is too large.',413);const value=await request.json() as AppState;if(!value||!Array.isArray(value.jobs)||!Array.isArray(value.transactions))throw new AuthError('Invalid application state');const current=await ensureState() as AppState;let next:AppState;try{next=authorizeStateChange(current,value,user.role)}catch(error){throw new AuthError(error instanceof Error?error.message:'Access denied.',403)}const result=await executeSql('UPDATE app_state SET payload = ?, updated_at = ? WHERE id = 1 AND BINARY payload = BINARY ?',[JSON.stringify(next),new Date().toISOString(),JSON.stringify(current)]);if(!result.affectedRows)throw new AuthError('Records changed in another session. Reload before saving.',409);return json({ok:true})}catch(error){return authFailure(error)}}
