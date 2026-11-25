export function applicationOrigin(request:Request,configuredUrl?:string){return configuredUrl?new URL(configuredUrl).origin:new URL(request.url).origin}
export function validWriteOrigin(request:Request,configuredUrl?:string){const origin=request.headers.get('origin');if(!origin)return false;try{return origin===applicationOrigin(request,configuredUrl)}catch{return false}}
export function secureSessionCookie(request:Request,configuredUrl?:string){return applicationOrigin(request,configuredUrl).startsWith('https://')}
