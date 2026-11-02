import {createClient} from '@supabase/supabase-js';
import webpush from 'web-push';
import {timingSafeEqual} from 'node:crypto';
import {jakartaDate,reminderTargets} from '../src/account-policy.js';
export function backend(){
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw Object.assign(new Error('Layanan akun belum dikonfigurasi pengelola.'),{status:503});
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export function authorizedCron(header,secret=process.env.CRON_SECRET){
  if(!secret||secret.length<32||typeof header!=='string')return false;
  const expected=Buffer.from('Bearer '+secret),actual=Buffer.from(header);
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
export async function authenticatedProfile(db,req){
  const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if(!token)throw Object.assign(new Error('Masuk dahulu untuk melanjutkan.'),{status:401});
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user)throw Object.assign(new Error('Sesi tidak valid. Masuk kembali.'),{status:401});
  const result=await db.from('flex_profiles').select('user_id,member_key').eq('user_id',data.user.id).maybeSingle();
  if(result.error||!result.data)throw Object.assign(new Error('Akun belum diizinkan untuk FlexKas.'),{status:403});
  return {...result.data,access_role:result.data.member_key==='fakhri'?'admin':'viewer'};
}
export function allowedEndpoint(endpoint){
  try{
    const u=new URL(endpoint),h=u.hostname;
    return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h==='web.push.apple.com'||h.endsWith('.push.apple.com')||/^[a-z0-9-]+\.notify\.windows\.com$/i.test(h));
  }catch{return false}
}
function pushOptions(){
  if(!process.env.VAPID_PUBLIC_KEY||!process.env.VAPID_PRIVATE_KEY)throw Object.assign(new Error('Pengingat HP belum dikonfigurasi pengelola.'),{status:503});
  return {TTL:3600,urgency:'normal',timeout:10000,vapidDetails:{subject:process.env.VAPID_SUBJECT||'https://kas-flexbox.vercel.app',publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY}};
}
export async function sendToSubscriptions(db,subscriptions,payload,{send=webpush.sendNotification.bind(webpush)}={}){
  const options=pushOptions();let sent=0,failed=0;
  for(const row of subscriptions){
    if(!allowedEndpoint(row.endpoint)){failed++;continue}
    try{await send({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify(payload),options);sent++}
    catch(error){failed++;if([404,410].includes(error.statusCode))await db.from('flex_push_subscriptions').delete().eq('id',row.id)}
  }
  return {sent,failed};
}
export async function processReminders(db,{date=jakartaDate(),deliver=sendToSubscriptions,memberKey=null,periodId=null}={}){
  const wallet=await db.from('flex_wallet').select('state').eq('singleton',true).single();
  const profiles=await db.from('flex_profiles').select('user_id,member_key');
  if(wallet.error||profiles.error)throw new Error('Kas tim belum bisa dimuat untuk pengingat.');
  if(periodId){
    const period=wallet.data.state.duesPeriods.find(p=>p.id===periodId);
    if(!period)throw Object.assign(new Error('Minggu iuran tidak ditemukan.'),{status:400});
    if(period.start>date)throw Object.assign(new Error('Minggu ini belum jatuh tempo. Gunakan Tes pengingat untuk pengecekan.'),{status:409});
  }
  if(memberKey&&!profiles.data.some(p=>p.member_key===memberKey))throw Object.assign(new Error('Akun tujuan belum tersedia.'),{status:409});
  const rows=profiles.data.filter(p=>!memberKey||p.member_key===memberKey).map(p=>({...p,access_role:p.member_key==='fakhri'?'admin':'viewer'}));
  const targets=reminderTargets(wallet.data.state,rows,date,periodId);let notified=0,devices=0,skipped=0,failed=0,withoutDevice=0;
  for(const {profile,due} of targets){
    const claim=await db.rpc('flex_claim_reminder',{p_user_id:profile.user_id,p_period_id:due.period.id,p_day:date});
    if(claim.error)throw new Error('Jadwal pengingat belum bisa diproses.');
    if(!claim.data){skipped++;continue}
    // Existing delivery history is also the durable in-app inbox. Push is optional.
    const logged=await db.from('flex_reminder_deliveries').update({status:'sent',updated_at:new Date().toISOString()}).eq('user_id',profile.user_id).eq('period_id',due.period.id).eq('day_jakarta',date);
    if(logged.error)throw new Error('Notifikasi belum dapat disimpan.');
    notified++;
    const subscriptions=await db.from('flex_push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',profile.user_id);
    if(subscriptions.error){failed++;continue}
    if(!subscriptions.data.length){withoutDevice++;continue}
    try{
      const result=await deliver(db,subscriptions.data,{title:'Pengingat iuran FlexKas',body:'Iuran belum lunas. Buka FlexKas untuk melihat detailnya.',tag:'flexkas-dues-'+due.period.id,data:{url:'/?page=notifications',userId:profile.user_id,periodId:due.period.id,kind:'dues'}});
      devices+=result.sent;failed+=result.failed;
    }catch{failed+=subscriptions.data.length}
  }
  return {eligible:targets.length,notified,devices,skipped,failed,withoutDevice};
}
export function respondError(res,error){return res.status(error.status||500).json({error:error.status?error.message:'Layanan pengingat belum berhasil. Coba lagi nanti.'})}
