import {paidForMember,weeklyTarget} from './cash-import.js';

// Calendar-month packages follow scheduled Fridays, not a fixed four-week fee.
export function monthPeriods(state,month){
  if(!/^\d{4}-\d{2}$/.test(month))return [];
  return (state.duesPeriods||[]).filter(p=>p.start.slice(0,7)===month).sort((a,b)=>a.start.localeCompare(b.start));
}
export function paymentPlan(state,memberId,periodIds){
  if(state.duesFrequency!=='weekly')throw new Error('Pembayaran sekaligus memerlukan jadwal iuran mingguan.');
  const member=state.members.find(m=>m.id===memberId);
  if(!member)throw new Error('Pilih anggota yang membayar.');
  if(!periodIds.length)throw new Error('Pilih setidaknya satu minggu pembayaran.');
  if(new Set(periodIds).size!==periodIds.length)throw new Error('Minggu pembayaran tidak boleh berulang.');
  const target=weeklyTarget(state);
  if(!Number.isSafeInteger(target)||target<=0)throw new Error('Nominal iuran tidak valid.');
  const allocations=periodIds.map(periodId=>{
    const period=state.duesPeriods.find(p=>p.id===periodId);
    if(!period)throw new Error('Jadwal minggu pembayaran tidak ditemukan.');
    const paid=paidForMember(state,memberId,periodId);
    return {period,paid,amount:Math.max(0,target-paid)};
  }).sort((a,b)=>a.period.start.localeCompare(b.period.start));
  const payable=allocations.filter(row=>row.amount>0);
  const total=payable.reduce((sum,row)=>sum+row.amount,0);
  if(!Number.isSafeInteger(total)||total>1e11)throw new Error('Total pembayaran terlalu besar.');
  return {member,allocations,payable,total,skipped:allocations.length-payable.length,target};
}
export function createDuesPayment(state,{memberId,periodIds,date,note=''},makeId=()=>crypto.randomUUID()){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date||date<'2000-01-01'||date>'2100-12-31')throw new Error('Tanggal pembayaran tidak valid.');
  const plan=paymentPlan(state,memberId,periodIds);
  if(!plan.total)throw new Error('Semua minggu terpilih sudah lunas. Tidak ada pembayaran baru.');
  const batchId=makeId();
  const records=plan.payable.map(({period,amount})=>({
    id:makeId(),batchId,type:'income',category:'Iuran',memberId,date,duesPeriod:period.id,amount,
    title:`Iuran ${plan.member.name} — Minggu ${period.week} / ${period.year}`,
    note:`Bayar sekaligus ${plan.payable.length} minggu. ${String(note).trim()}`.trim().slice(0,1000)
  }));
  return {state:{...state,transactions:[...state.transactions,...records]},plan,records};
}
