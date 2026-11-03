import {ALARM_SECONDS,createAlarmAudio,recentAlarmRows} from './alarm-audio.js';
const audio=createAlarmAudio();
let active=null,timer=null,root=null,lastFocus=null,previousOverflow='';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const unlockReminderSound=profile=>profile?.access_role==='viewer'?audio.unlock():Promise.resolve(false);
export function dismissReminderAlarm(){
  audio.stop();clearTimeout(timer);timer=null;
  if(!active)return;
  active=null;root.innerHTML='';document.body.style.overflow=previousOverflow;
  if(lastFocus?.isConnected)lastFocus.focus();lastFocus=null;
}
function beginSound(){
  if(!active||document.visibilityState!=='visible')return false;
  if(!audio.start())return false;
  clearTimeout(timer);
  root.querySelector('#alarm-status').textContent=`Alarm berbunyi hingga ${ALARM_SECONDS} detik. Kamu bisa menghentikannya sekarang.`;
  root.querySelector('#alarm-play').hidden=true;
  root.querySelector('#alarm-stop').textContent='Hentikan alarm';
  timer=setTimeout(()=>{
    audio.stop();timer=null;
    if(!active)return;
    root.querySelector('#alarm-status').textContent='Alarm sudah berhenti. Pengingat tetap tersedia di menu Notifikasi.';
    root.querySelector('#alarm-stop').textContent='Tutup';
  },ALARM_SECONDS*1000);
  return true;
}
export function showReminderAlarm(rows,profile,onOpen,{now=Date.now()}={}){
  const recent=recentAlarmRows(rows,now);
  if(profile?.access_role!=='viewer'||document.visibilityState!=='visible'||!recent.length)return false;
  dismissReminderAlarm();
  if(!root){root=document.createElement('div');root.id='reminder-alarm-root';document.body.append(root)}
  lastFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  active={userId:profile.user_id,ids:recent.map(row=>row.id)};
  const first=recent[0],test=first.kind==='test';
  root.innerHTML=`<div class="reminder-alarm-backdrop"><section class="reminder-alarm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reminder-alarm-title" aria-describedby="reminder-alarm-description"><div class="alarm-bell" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></div><span class="alarm-kicker">${test?'TES ALARM DARI FAKHRI':'PENGINGAT DARI FAKHRI'}</span><h2 id="reminder-alarm-title">${test?'Tes alarm pengingat kas':'Jangan lupa iuran kasmu'}</h2><p id="reminder-alarm-description">${esc(first.body)}</p>${recent.length>1?`<p class="alarm-extra">${recent.length} pengingat baru masuk ke akunmu.</p>`:''}<p class="alarm-status" id="alarm-status" role="status">Browser belum mengizinkan suara otomatis. Ketuk Bunyikan alarm untuk mencoba.</p><button class="btn primary" id="alarm-play">Bunyikan alarm</button><div class="alarm-actions"><button class="btn" id="alarm-stop">Tutup</button><button class="btn primary" id="alarm-open">Lihat notifikasi</button></div></section></div>`;
  root.querySelector('#alarm-stop').onclick=dismissReminderAlarm;
  root.querySelector('#alarm-open').onclick=()=>{dismissReminderAlarm();onOpen?.()};
  root.querySelector('#alarm-play').onclick=async()=>{await audio.unlock();if(!active)return;if(!beginSound())root.querySelector('#alarm-status').textContent='Suara belum dapat diputar. Periksa volume HP atau izin suara browser.'};
  root.onkeydown=event=>{
    if(event.key==='Escape'){event.stopPropagation();event.preventDefault();dismissReminderAlarm()}
    if(event.key==='Tab'){
      event.stopPropagation();const buttons=[...root.querySelectorAll('button')].filter(button=>!button.hidden&&!button.disabled),first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  };
  beginSound();root.querySelector('#alarm-stop').focus();
  return true;
}
export function reconcileReminderAlarm(rows,profile){
  if(active&&(active.userId!==profile?.user_id||!rows.some(row=>active.ids.includes(row.id))))dismissReminderAlarm();
}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')dismissReminderAlarm()});
