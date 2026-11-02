import {backend,authenticatedProfile,sendToSubscriptions,respondError} from '../server/push.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method!=='POST')return res.status(405).json({error:'Metode tidak didukung.'});
    const db=backend(),profile=await authenticatedProfile(db,req);
    const claim=await db.rpc('flex_claim_push_test',{p_user_id:profile.user_id});
    if(claim.error)throw claim.error;
    if(!claim.data)return res.status(429).json({error:'Tunggu satu menit sebelum tes notifikasi lagi.'});
    const subs=await db.from('flex_push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',profile.user_id);
    if(subs.error)throw subs.error;
    if(!subs.data.length)return res.status(409).json({error:'Aktifkan notifikasi pada perangkat ini terlebih dahulu.'});
    const result=await sendToSubscriptions(db,subs.data,{title:'FlexKas siap mengingatkan',body:'Notifikasi akunmu aktif. Pengingat akan dikirim jika iuran belum lunas.',tag:'flexkas-push-test',data:{url:'/?page=dues',userId:profile.user_id}});
    if(!result.sent)return res.status(502).json({error:'Notifikasi belum terkirim. Aktifkan ulang perangkat lalu coba lagi.'});
    return res.status(200).json(result);
  }catch(error){return respondError(res,error)}
}
