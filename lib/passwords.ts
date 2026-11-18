import { scrypt,randomBytes,timingSafeEqual,createHash } from 'node:crypto';
const parameters={N:16384,r:8,p:5,maxmem:32*1024*1024};
function derive(password:string,salt:string):Promise<Buffer>{return new Promise((resolve,reject)=>{scrypt(password,salt,32,parameters,(error,key)=>error?reject(error):resolve(key))})}
export function validatePassword(password:unknown):asserts password is string{if(typeof password!=='string'||password.length<12||new TextEncoder().encode(password).length>256)throw Error('Use a password of at least 12 characters and at most 256 bytes.')}
export async function hashPassword(password:string){validatePassword(password);const salt=randomBytes(16).toString('hex');return 'scrypt:16384:8:5:'+salt+':'+(await derive(password,salt)).toString('hex')}
export async function verifyPassword(password:string,stored:string){if(typeof password!=='string'||new TextEncoder().encode(password).length>256)return false;const [algorithm,n,r,p,salt,hash]=stored.split(':');if(algorithm!=='scrypt'||n!=='16384'||r!=='8'||p!=='5'||!salt||!hash)return false;const actual=await derive(password,salt),expected=Buffer.from(hash,'hex');return expected.length===actual.length&&timingSafeEqual(actual,expected)}
export function newToken(){return randomBytes(32).toString('hex')}
export function tokenHash(token:string){return createHash('sha256').update(token).digest('hex')}
export function constantMatch(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
