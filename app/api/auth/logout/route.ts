import { sameOrigin,ensureAuth,cookieName,json,sessionCookie,authFailure } from '../../../../lib/auth';
import { executeSql } from '../../../../lib/database';
import { tokenHash } from '../../../../lib/passwords';
export async function POST(request:Request){try{sameOrigin(request);await ensureAuth();const token=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(token)await executeSql('DELETE FROM auth_sessions WHERE token_hash=?',[tokenHash(token)]);return json({ok:true},200,{'set-cookie':sessionCookie(request,'',0)})}catch(error){return authFailure(error)}}
