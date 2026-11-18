'use client';
import { createContext,useContext,useEffect,useState,type ReactNode } from 'react';
import type { SessionUser } from './permissions';
const AuthContext=createContext<SessionUser|null>(null);
export function useUser(){const user=useContext(AuthContext);if(!user)throw Error('Sign in to use the workspace.');return user}
export default function AuthBoundary({children}:{children:ReactNode}){
 const [user,setUser]=useState<SessionUser|null>(null),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;fetch('/api/auth/session',{cache:'no-store'}).then(async response=>{if(!response.ok)throw Error('Unable to check your session.');return response.json() as Promise<{user:SessionUser|null}>}).then((result:{user:SessionUser|null})=>{if(cancelled)return;if(result.user)setUser(result.user);else window.location.replace('/login?next='+encodeURIComponent(window.location.pathname+window.location.search))}).catch(error=>{if(!cancelled)setError(error instanceof Error?error.message:'Unable to check your session.')});return ()=>{cancelled=true}},[]);
 if(!user)return <div className="auth-loading" role="status"><strong>Keep & Care</strong><p>{error||'Checking your session...'}</p>{error&&<button className="outline" onClick={()=>window.location.reload()}>Try again</button>}</div>;
 return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>
}
export async function logout(){const response=await fetch('/api/auth/logout',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});if(!response.ok)throw Error('Could not sign out. Try again.');window.location.assign('/login')}
