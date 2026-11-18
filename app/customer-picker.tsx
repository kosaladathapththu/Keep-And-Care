'use client';
import { useEffect,useId,useRef,useState,type KeyboardEvent } from 'react';
import { Icon } from './icons';
import type { Customer } from './records';

export default function CustomerPicker({customers,value,onSelect}:{customers:Customer[];value:string;onSelect:(name:string)=>void}){
 const id=useId(),input=useRef<HTMLInputElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState(value),[filter,setFilter]=useState(''),[active,setActive]=useState(0);
 const matches=customers.filter(customer=>[customer.name,customer.phone,customer.email].join(' ').toLowerCase().includes(filter.trim().toLowerCase()));
 const activeIndex=Math.max(0,Math.min(active,Math.max(0,matches.length-1)));
 useEffect(()=>{if(open)document.getElementById(id+'-option-'+activeIndex)?.scrollIntoView({block:'nearest'})},[open,id,activeIndex]);
 function choose(customer:Customer){setQuery(customer.name);setFilter('');onSelect(customer.name);setOpen(false);input.current?.setCustomValidity('')}
 function keyDown(event:KeyboardEvent<HTMLInputElement>){
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){
   event.preventDefault();setOpen(true);setActive(index=>!open?(event.key==='ArrowUp'?Math.max(0,matches.length-1):0):event.key==='ArrowDown'?Math.min(index+1,matches.length-1):Math.max(index-1,0));
  }else if(event.key==='Enter'&&open){event.preventDefault();if(matches[activeIndex])choose(matches[activeIndex])}
  else if(event.key==='Escape'){event.preventDefault();setOpen(false)}
 }
 return <div className="customer-picker"><label htmlFor={id}>Existing customer</label><div className={`customer-picker-control ${open?'is-open':''}`}><Icon name="search" size={19}/><input ref={input} id={id} name="existingCustomerSearch" role="combobox" type="text" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={id+'-options'} aria-activedescendant={open&&matches.length?id+'-option-'+activeIndex:undefined} required value={query} placeholder="Search or select a customer by name, phone or email" onFocus={()=>{setFilter(value?'':query);setOpen(true);setActive(0)}} onChange={event=>{setQuery(event.target.value);setFilter(event.target.value);onSelect('');setOpen(true);setActive(0);event.target.setCustomValidity(event.target.value?'Select a customer from the list.':'')}} onKeyDown={keyDown} onBlur={()=>setOpen(false)} onInvalid={()=>setOpen(true)}/><button type="button" aria-label={open?'Close customer list':'Show customers'} aria-expanded={open} aria-controls={id+'-options'} onMouseDown={event=>event.preventDefault()} onClick={()=>{setFilter('');setActive(0);setOpen(current=>!current);input.current?.focus()}}><svg className="ui-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div><input type="hidden" name="existingCustomer" value={value}/>{open&&<div className="customer-picker-menu"><ul id={id+'-options'} role="listbox" aria-label="Customers">{matches.map((customer,index)=><li key={customer.id} role="option" id={id+'-option-'+index} aria-selected={index===activeIndex}><button type="button" tabIndex={-1} className={index===activeIndex?'active':''} onMouseDown={event=>event.preventDefault()} onMouseEnter={()=>setActive(index)} onClick={()=>choose(customer)}><span className="customer-initial">{customer.name.slice(0,2).toUpperCase()}</span><span className="customer-picker-description"><strong>{customer.name}</strong>{(customer.phone||customer.email)&&<small>{[customer.phone,customer.email].filter(Boolean).join(' | ')}</small>}</span>{value===customer.name&&<Icon name="check" size={17}/>}</button></li>)}</ul>{!matches.length&&<p className="customer-picker-empty" role="status">{customers.length?'No matching customers. Try another search or choose New customer.':'No saved customers yet. Choose New customer to add one.'}</p>}</div>}</div>
}
