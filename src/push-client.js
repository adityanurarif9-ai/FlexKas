import {apiRequest} from './cloud.js';
const publicKey=import.meta.env.VITE_VAPID_PUBLIC_KEY||'';
function keyBytes(value){const s=value.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))}
function boundUser(){try{return localStorage.getItem('flexkas:push-user')}catch{return null}}
export async function enablePush(client,profile){
  if(!publicKey)throw new Error('Pengingat HP belum diaktifkan oleh pengelola.');
  if(import.meta.env.DEV)throw new Error('Buka https://kas-flexbox.vercel.app dari HP untuk mengaktifkan notifikasi.');
  if(!window.isSecureContext||!('serviceWorker'in navigator)||!('Notification'in window)||!('PushManager'in window))throw new Error('Browser ini belum mendukung notifikasi. Di iPhone, pasang ke layar utama lalu buka ikon FlexKas.');
  if(Notification.permission==='denied')throw new Error('Notifikasi diblokir. Izinkan FlexKas lewat pengaturan browser atau HP.');
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Izin notifikasi belum diberikan. Kamu tetap bisa melihat status iuran di aplikasi.');
  let timer;
  const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>timer=setTimeout(()=>reject(new Error('Aplikasi belum siap untuk notifikasi. Muat ulang lalu coba lagi.')),10000))]).finally(()=>clearTimeout(timer));
  let subscription=await registration.pushManager.getSubscription();
  if(subscription&&boundUser()!==profile.user_id){await subscription.unsubscribe();subscription=null}
  subscription ||= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(publicKey)});
  const serialized=subscription.toJSON();
  const {error}=await client.from('flex_push_subscriptions').upsert({user_id:profile.user_id,endpoint:subscription.endpoint,p256dh:serialized.keys.p256dh,auth:serialized.keys.auth},{onConflict:'endpoint'});
  if(error){await subscription.unsubscribe().catch(()=>{});throw new Error('Izin browser sudah ada, tetapi perangkat belum terdaftar. Coba aktifkan lagi.')}
  try{localStorage.setItem('flexkas:push-user',profile.user_id)}catch{}
  return true;
}
export async function disablePush(client){
  if(!('serviceWorker'in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration('/');
  const sub=await registration?.pushManager?.getSubscription();
  if(sub){await sub.unsubscribe();await client.from('flex_push_subscriptions').delete().eq('endpoint',sub.endpoint)}
  try{localStorage.removeItem('flexkas:push-user')}catch{}
}
export const testPush=()=>apiRequest('/api/push-test');
export const sendReminders=()=>apiRequest('/api/reminders');
export function pushState(profile){return typeof Notification!=='undefined'&&Notification.permission==='granted'&&boundUser()===profile?.user_id}

let audio=null,lastTone=0;
function soundPreference(profile){try{return localStorage.getItem('flexkas:sound:'+profile.user_id)==='yes'}catch{return false}}
export async function setReminderSound(profile,enabled){
  if(enabled){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw new Error('Browser ini belum mendukung suara pengingat.');audio ||= new Context();await audio.resume()}
  try{localStorage.setItem('flexkas:sound:'+profile.user_id,enabled?'yes':'no')}catch{}
  if(enabled)playReminderSound(profile,true);
}
export function reminderSoundEnabled(profile){return soundPreference(profile)}
export function unlockReminderSound(profile){
  if(!soundPreference(profile))return;
  const Context=window.AudioContext||window.webkitAudioContext;
  if(Context){audio ||= new Context();audio.resume().catch(()=>{})}
}
export function playReminderSound(profile,force=false){
  if(!profile||profile.access_role!=='viewer'||!soundPreference(profile)||!audio||audio.state!=='running'||document.visibilityState!=='visible'||(!force&&Date.now()-lastTone<30*60*1000))return false;
  lastTone=Date.now();
  for(let i=0;i<3;i++){const start=audio.currentTime+i*.35,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=i===1?740:554;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.03);gain.gain.exponentialRampToValueAtTime(.001,start+.22);osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.25)}
  return true;
}
