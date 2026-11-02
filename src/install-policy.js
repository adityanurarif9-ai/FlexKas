export const INSTALL_STATE_KEY='flexkas:install-promotion:v1';
export const SNOOZE_MS=7*24*60*60*1000;
export const INSTALLED_HINT_MS=30*24*60*60*1000;
export function installPlatform({userAgent='',platform='',touchPoints=0}={}){
  if(/iPhone|iPad|iPod/i.test(userAgent)||(platform==='MacIntel'&&touchPoints>1))return 'ios';
  return /Android/i.test(userAgent)?'android':'desktop';
}
export function validTimestamp(value,now){return Number.isFinite(value)&&value>0&&value<=now?value:0}
export function readInstallState(storage,now=Date.now()){
  try{const s=JSON.parse(storage.getItem(INSTALL_STATE_KEY))||{};return{dismissedAt:validTimestamp(s.dismissedAt,now),installedAt:validTimestamp(s.installedAt,now)}}catch{return{dismissedAt:0,installedAt:0}}
}
export function shouldOfferInstall({mobile,standalone,shownThisVisit=false,dismissedAt=0,installedAt=0,now=Date.now()}){
  return !!mobile&&!standalone&&!shownThisVisit&&!(validTimestamp(dismissedAt,now)&&now-dismissedAt<SNOOZE_MS)&&!(validTimestamp(installedAt,now)&&now-installedAt<INSTALLED_HINT_MS);
}
