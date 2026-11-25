'use client';
import { useId,useState } from 'react';
import { Icon } from './icons';
export default function PasswordField({label,name,autoComplete='current-password',minLength,required=true,hint}:{label:string;name:string;autoComplete?:string;minLength?:number;required?:boolean;hint?:string}){
 const id=useId(),[visible,setVisible]=useState(false);
 return <div className="password-field"><label htmlFor={id}>{label}</label><span className="password-control"><input id={id} name={name} type={visible?'text':'password'} autoComplete={autoComplete} minLength={minLength} maxLength={256} required={required} aria-describedby={hint?id+'-hint':undefined}/><button type="button" aria-label={(visible?'Hide ':'Show ')+label.toLowerCase()} aria-pressed={visible} onClick={()=>setVisible(!visible)}><Icon name="eye" size={18}/>{visible?'Hide':'Show'}</button></span>{hint&&<small id={id+'-hint'}>{hint}</small>}</div>
}
