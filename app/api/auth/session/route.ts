import { ensureAuth,getUser,hasUsers,json,localSetup,authFailure } from '../../../../lib/auth';
export async function GET(request:Request){try{await ensureAuth();const initialized=await hasUsers();return json({user:await getUser(request),setupRequired:!initialized,localSetup:!initialized&&localSetup(request)})}catch(error){return authFailure(error)}}
