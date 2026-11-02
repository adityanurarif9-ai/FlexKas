export const LOGIN_DOMAIN='flexboxstudio.site';
export const ACCOUNT_KEYS=['adit','rainer','kiandra','bima','fakhri'];
export function loginEmail(value){
  let email=String(value||'').trim().toLowerCase();
  if(!email.includes('@'))email+='@'+LOGIN_DOMAIN;
  if(!ACCOUNT_KEYS.some(name=>email===`${name}@${LOGIN_DOMAIN}`))throw new Error('Gunakan akun anggota Flexbox yang diberikan pengelola.');
  return email;
}
export function canManage(profile){return profile?.member_key==='fakhri'&&profile?.access_role==='admin'}
export function jakartaDate(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const part=key=>parts.find(p=>p.type===key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function memberDues(state,profile,date=jakartaDate()){
  const period=state?.duesPeriods?.find(p=>p.start<=date&&p.end>=date);
  return period?duesForPeriod(state,profile,period.id):null;
}
export function duesForPeriod(state,profile,periodId){
  const member=state?.members?.find(m=>m.name.trim().toLowerCase()===profile?.member_key);
  const period=state?.duesPeriods?.find(p=>p.id===periodId);
  if(!member||!period||state.duesFrequency!=='weekly')return null;
  const target=Number(state.weeklyDues);
  if(!Number.isSafeInteger(target)||target<=0)return null;
  const paid=state.transactions.filter(t=>t.type==='income'&&t.category==='Iuran'&&t.memberId===member.id&&t.duesPeriod===period.id).reduce((sum,t)=>sum+t.amount,0);
  return {member,period,target,paid,remaining:Math.max(0,target-paid),status:paid>=target?'Lunas':paid>0?'Belum lunas':'Belum bayar'};
}
export function reminderTargets(state,profiles,date=jakartaDate(),periodId=null){
  return profiles.filter(p=>p.access_role==='viewer'&&p.member_key!=='fakhri').flatMap(profile=>{
    const due=periodId?duesForPeriod(state,profile,periodId):memberDues(state,profile,date);
    return due?.remaining>0&&due.period.start<=date?[{profile,due,date}]:[];
  });
}
export function validatePassword(password,confirmation){
  if(password.length<12)throw new Error('Password minimal 12 karakter.');
  if(password!==confirmation)throw new Error('Konfirmasi password belum sama.');
}
