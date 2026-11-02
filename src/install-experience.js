import {INSTALL_STATE_KEY,INSTALLED_HINT_MS,installPlatform,readInstallState,shouldOfferInstall} from './install-policy.js';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function browserInstallEnvironment(){
  const platform=installPlatform({userAgent:navigator.userAgent,platform:navigator.platform,touchPoints:navigator.maxTouchPoints});
  return{platform,mobile:platform!=='desktop'||navigator.userAgentData?.mobile===true||(matchMedia('(max-width:600px)').matches&&matchMedia('(pointer:coarse)').matches),
    standalone:navigator.standalone===true||['standalone','fullscreen','minimal-ui','window-controls-overlay'].some(m=>matchMedia(`(display-mode:${m})`).matches),secure:window.isSecureContext,
    inApp:/FBAN|FBAV|Instagram|\bwv\b|Line\//i.test(navigator.userAgent)};
}
export function createInstallExperience({environment=browserInstallEnvironment,storage=null,isBusy=()=>false,onMessage=()=>{},delay=1000}={}){
  if(!storage){try{storage=window.localStorage}catch{storage={getItem:()=>null,setItem:()=>{}}}}
  let state=readInstallState(storage),promptEvent=null,shownThisVisit=false,portal=null,view='offer',previousFocus=null,previousOverflow='',inFlight=false,destroyed=false;
  function persist(){try{storage.setItem(INSTALL_STATE_KEY,JSON.stringify(state))}catch{}}
  function refreshButtons(){const installed=environment().standalone||(!promptEvent&&state.installedAt>0&&Date.now()-state.installedAt<INSTALLED_HINT_MS);document.querySelectorAll('#install-app').forEach(b=>b.hidden=installed)}
  function dismiss({snooze=true}={}){
    if(!portal)return;
    if(snooze){state.dismissedAt=Date.now();persist()}
    portal.remove();portal=null;document.body.style.overflow=previousOverflow;previousFocus?.focus();
  }
  function instructions(env){
    if(!env.secure)return '<p>Pemasangan aplikasi memerlukan alamat HTTPS. Buka alamat FlexKas berikut dari browser HP.</p><a class="btn primary" href="https://kas-flexbox.vercel.app/">Buka kas-flexbox.vercel.app</a>';
    if(env.inApp)return '<p>Buka tautan ini di browser utama HP terlebih dahulu.</p><ol><li>Ketuk menu <strong>⋮</strong> atau <strong>…</strong> pada aplikasi ini.</li><li>Pilih <strong>Buka di Chrome</strong> atau <strong>Buka di Safari</strong>.</li><li>Di browser tersebut, buka kembali tombol <strong>Pasang aplikasi</strong> di FlexKas.</li></ol>';
    if(env.platform==='ios')return '<p>Di iPhone/iPad, tambahkan FlexKas dari menu Bagikan.</p><ol><li>Ketuk <strong>Bagikan</strong>, atau <strong>… → Bagikan</strong>.</li><li>Pilih <strong>Tambahkan ke Layar Utama</strong>. Jika belum ada, periksa <strong>Edit Tindakan</strong>.</li><li>Aktifkan <strong>Buka sebagai App</strong> jika tersedia, lalu ketuk <strong>Tambah</strong>.</li></ol>';
    if(env.platform==='android')return '<p>Buka FlexKas melalui Chrome atau Edge di HP.</p><ol><li>Ketuk menu browser <strong>⋮</strong>.</li><li>Pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>.</li><li>Konfirmasi pemasangan, lalu buka ikon FlexKas dari layar utama.</li></ol><p class="install-footnote">Jika menu instal belum ada, muat ulang halaman dan coba lagi setelah browser selesai memeriksa aplikasi.</p>';
    return '<p>Di Chrome atau Edge, klik ikon instal di bilah alamat atau buka menu browser dan pilih <strong>Instal FlexKas</strong>. Di Safari Mac, pilih <strong>File → Tambahkan ke Dock</strong>.</p>';
  }
  function paint(){
    if(!portal)return;
    const env=environment(),ready=!!promptEvent&&env.secure&&!env.inApp;
    const label=ready?'Instal sekarang':view==='guide'?'Mengerti':env.platform==='ios'?'Cara memasang di iPhone':'Lihat cara memasang';
    const hadFocus=portal.contains(document.activeElement);
    portal.innerHTML=`<section class="install-sheet" role="dialog" aria-modal="true" aria-labelledby="install-title"><button class="install-close" aria-label="Tutup ajakan instal">×</button><img class="install-app-icon" src="/assets/flexkas-icon-192.png" alt="Ikon FlexKas"><p class="install-kicker">FLEXKAS DI LAYAR UTAMA</p><h2 id="install-title">${view==='guide'?'Cara memasang FlexKas':'Kas tim, sekali ketuk.'}</h2>${view==='guide'?`<div class="install-steps">${instructions(env)}</div>`:`<p class="install-description">Pasang FlexKas di layar utama HP. Buka kas tim lebih cepat, dengan tampilan seperti aplikasi.</p><div class="install-benefits"><span>✓ Ikon di layar utama</span><span>✓ Tampilan aplikasi</span></div><p class="install-platform-note">${!env.secure?'Gunakan alamat HTTPS untuk memasang.':env.inApp?'Buka di browser utama agar pemasangan tersedia.':ready?'Konfirmasi pemasangan pada dialog browser setelah mengetuk tombol.':env.platform==='ios'?'iPhone menggunakan menu Bagikan untuk pemasangan.':'Petunjuk tetap tersedia jika browser belum menampilkan dialog instal.'}</p>`}<button class="btn primary install-primary">${escapeHTML(label)}</button>${view==='offer'?'<button class="install-later">Nanti saja</button>':''}</section>`;
    portal.querySelector('.install-close').onclick=()=>dismiss();
    portal.querySelector('.install-later')?.addEventListener('click',()=>dismiss());
    portal.querySelector('.install-primary').onclick=activate;
    if(hadFocus)portal.querySelector('.install-primary').focus();
  }
  async function activate(){
    if(inFlight)return;
    const env=environment();
    if(view==='guide'&&(!promptEvent||!env.secure||env.inApp)){dismiss();return}
    if(!promptEvent||!env.secure||env.inApp){view='guide';paint();portal?.querySelector('.install-primary')?.focus();return}
    const event=promptEvent;promptEvent=null;inFlight=true;dismiss();
    try{
      // Called directly from the click handler: native prompts require a user gesture.
      await event.prompt();
      const result=await event.userChoice;
      if(result.outcome==='accepted')onMessage('Ikuti konfirmasi browser untuk memasang FlexKas.');
    }catch{view='guide';open({manual:true,guide:true})}
    finally{inFlight=false}
  }
  function open({manual=false,guide=false}={}){
    if(destroyed)return false;
    const env=environment();
    if(env.standalone){refreshButtons();if(manual)onMessage('FlexKas sudah dibuka sebagai aplikasi.');return false}
    if(portal){if(guide)view='guide';paint();return true}
    if(isBusy())return false;
    if(!manual&&!shouldOfferInstall({...env,...state,shownThisVisit}))return false;
    shownThisVisit=true;view=guide?'guide':'offer';previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;
    portal=document.createElement('div');portal.className='install-backdrop';document.body.append(portal);document.body.style.overflow='hidden';
    portal.addEventListener('click',e=>{if(e.target===portal)dismiss()});paint();portal.querySelector('.install-primary')?.focus();return true;
  }
  function maybeOffer(){refreshButtons();if(document.visibilityState==='visible')open()}
  function capturePrompt(e){e.preventDefault();promptEvent=e;state.installedAt=0;persist();if(portal){paint()}else{maybeOffer()}}
  function installed(){promptEvent=null;state.installedAt=Date.now();persist();dismiss({snooze:false});refreshButtons();onMessage('FlexKas berhasil dipasang di layar utama.')}
  function onKey(e){
    if(!portal)return;
    if(e.key==='Escape'){e.preventDefault();dismiss();return}
    if(e.key==='Tab'){
      const items=[...portal.querySelectorAll('button,a[href]')],first=items[0],last=items.at(-1);
      if(!portal.contains(document.activeElement)){e.preventDefault();first.focus()}
      else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
    }
  }
  const display=matchMedia('(display-mode:standalone)');
  const modeChanged=()=>{if(environment().standalone)dismiss({snooze:false});refreshButtons()};
  window.addEventListener('beforeinstallprompt',capturePrompt);window.addEventListener('appinstalled',installed);
  document.addEventListener('keydown',onKey);document.addEventListener('visibilitychange',maybeOffer);display.addEventListener?.('change',modeChanged);
  const timer=setTimeout(maybeOffer,delay);refreshButtons();
  return{open:()=>open({manual:true}),maybeOffer,refreshButtons,capturePrompt,destroy(){destroyed=true;clearTimeout(timer);dismiss({snooze:false});window.removeEventListener('beforeinstallprompt',capturePrompt);window.removeEventListener('appinstalled',installed);document.removeEventListener('keydown',onKey);document.removeEventListener('visibilitychange',maybeOffer);display.removeEventListener?.('change',modeChanged)}};
}
