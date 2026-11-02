import {paidForMember,weeklyTarget} from './cash-import.js';
export function annualReportData(state,year){
  year=String(year);if(!/^\d{4}$/.test(year))throw new Error('Tahun laporan tidak valid.');
  const start=year+'-01-01',end=year+'-12-31',transactions=state.transactions.filter(t=>t.date>=start&&t.date<=end);
  const delta=tx=>tx.reduce((sum,t)=>sum+(t.type==='income'?t.amount:-t.amount),0);
  const opening=(state.openingBalance||0)+delta(state.transactions.filter(t=>t.date<start));
  let carry=opening;
  const months=Array.from({length:12},(_,index)=>{
    const month=year+'-'+String(index+1).padStart(2,'0'),rows=transactions.filter(t=>t.date.startsWith(month));
    const income=rows.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0),expense=rows.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const row={month,opening:carry,income,expense,net:income-expense,count:rows.length,closing:carry+income-expense};carry=row.closing;return row;
  });
  const periods=(state.duesPeriods||[]).filter(p=>String(p.year)===year),target=weeklyTarget(state);
  const members=state.members.map(member=>{
    const amounts=periods.map(period=>paidForMember(state,member.id,period.id));
    const paid=amounts.reduce((a,b)=>a+b,0),credited=amounts.reduce((sum,amount)=>sum+Math.min(amount,target),0);
    return {member,target:target*periods.length,paid,credited,remaining:target*periods.length-credited,extra:paid-credited,paidWeeks:amounts.filter(amount=>amount>=target).length,weeks:periods.length};
  });
  return {year,opening,closing:carry,transactions,months,members,
    income:months.reduce((s,m)=>s+m.income,0),expense:months.reduce((s,m)=>s+m.expense,0),net:carry-opening};
}
