import {duesForPeriod} from './account-policy.js';
export function visibleNotifications(rows,state,profile){
  return rows.filter(row=>row.userId===profile?.user_id&&(row.kind==='test'||(row.kind==='dues'&&duesForPeriod(state,profile,row.periodId)?.remaining>0)));
}
export function inboxFromHistory(state,profile,deliveries,lastTest){
  const rows=deliveries.filter(row=>row.user_id===profile.user_id&&row.status==='sent').flatMap(row=>{
    const due=duesForPeriod(state,profile,row.period_id);
    if(!due||due.remaining<=0)return [];
    return [{id:`dues:${row.period_id}:${row.day_jakarta}`,kind:'dues',userId:profile.user_id,periodId:row.period_id,
      title:'Pengingat iuran kas',body:`Iuran minggu ${due.period.week} / ${due.period.year} belum lunas. Sisa Rp${due.remaining.toLocaleString('id-ID')}. Pembayaran dicatat oleh Fakhri.`,createdAt:row.updated_at}];
  });
  if(lastTest?.user_id===profile.user_id&&Number.isFinite(Date.parse(lastTest.last_test_at)))rows.push({
    id:'test:'+lastTest.last_test_at,kind:'test',userId:profile.user_id,title:'Tes pengingat FlexKas',
    body:'Ini pesan uji notifikasi dan suara. Pesan tes tetap muncul meskipun iuran sudah lunas; tidak berarti ada tunggakan.',createdAt:lastTest.last_test_at
  });
  return rows.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt)).slice(0,100);
}
