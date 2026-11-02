import {ACCOUNT_KEYS,jakartaDate} from '../src/account-policy.js';
import {inboxFromHistory} from '../src/notification-policy.js';
import {sendToSubscriptions} from './push.js';
export function requireReminderAdmin(profile){
  if(profile?.member_key!=='fakhri'||profile?.access_role!=='admin')throw Object.assign(new Error('Hanya Fakhri yang dapat mengirim atau menguji pengingat.'),{status:403});
}
export function reminderRequest(body){
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{throw Object.assign(new Error('Permintaan pengingat tidak valid.'),{status:400})}}
  body ||= {};
  if(Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!['memberKey','periodId'].includes(k)))throw Object.assign(new Error('Permintaan pengingat tidak valid.'),{status:400});
  if(body.memberKey!==undefined&&!ACCOUNT_KEYS.includes(body.memberKey))throw Object.assign(new Error('Akun tujuan tidak valid.'),{status:400});
  if(body.periodId!==undefined&&!/^\d{4}-W\d{2}$/.test(body.periodId))throw Object.assign(new Error('Minggu tujuan tidak valid.'),{status:400});
  return {memberKey:body.memberKey||null,periodId:body.periodId||null};
}
export async function listNotifications(db,profile){
  const [wallet,deliveries,test]=await Promise.all([
    db.from('flex_wallet').select('state').eq('singleton',true).single(),
    db.from('flex_reminder_deliveries').select('user_id,period_id,day_jakarta,status,updated_at').eq('user_id',profile.user_id).eq('status','sent').order('updated_at',{ascending:false}).limit(100),
    db.from('flex_push_test_limits').select('user_id,last_test_at').eq('user_id',profile.user_id).maybeSingle()
  ]);
  if(wallet.error||deliveries.error||test.error)throw new Error('Kotak notifikasi belum dapat dimuat.');
  return {notifications:inboxFromHistory(wallet.data.state,profile,deliveries.data,test.data),date:jakartaDate()};
}
export async function sendTestReminder(db,actor,memberKey,{deliver=sendToSubscriptions}={}){
  requireReminderAdmin(actor);
  memberKey ||= actor.member_key;
  if(!ACCOUNT_KEYS.includes(memberKey))throw Object.assign(new Error('Akun tujuan tidak valid.'),{status:400});
  const target=await db.from('flex_profiles').select('user_id,member_key').eq('member_key',memberKey).maybeSingle();
  if(target.error||!target.data)throw Object.assign(new Error('Akun tujuan belum tersedia.'),{status:409});
  const userId=target.data.user_id;
  const claim=await db.rpc('flex_claim_push_test',{p_user_id:userId});
  if(claim.error)throw claim.error;
  if(!claim.data)throw Object.assign(new Error('Tunggu satu menit sebelum mengirim tes ke akun ini lagi.'),{status:429});
  const subs=await db.from('flex_push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id',userId);
  if(subs.error)throw subs.error;
  let result={sent:0,failed:0};
  if(subs.data.length){
    try{result=await deliver(db,subs.data,{title:'Tes pengingat FlexKas',body:'Ini hanya tes notifikasi. Pesan uji tetap dapat diterima saat iuran sudah lunas.',tag:'flexkas-push-test',data:{url:'/?page=notifications',userId,kind:'test'}})}catch{result={sent:0,failed:subs.data.length}}
  }
  return {...result,inbox:1,memberKey,deviceRegistered:subs.data.length>0};
}
