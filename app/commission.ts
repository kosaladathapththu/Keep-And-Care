export function splitCommission(amount:number,count:number):number[]{
 const cents=Math.round(amount*100);
 if(!Number.isFinite(amount)||!Number.isSafeInteger(cents)||amount<=0||Math.abs(amount*100-cents)>0.00001||!Number.isInteger(count)||count<1||cents<count)throw new Error('Enter a positive amount with up to two decimal places and at least one cent per recipient.');
 const base=Math.floor(cents/count),remainder=cents%count;
 return Array.from({length:count},(_,i)=>(base+(i<remainder?1:0))/100);
}
