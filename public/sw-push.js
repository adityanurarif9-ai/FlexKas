self.addEventListener('push',event=>{
  let payload;try{payload=event.data?.json()}catch{}
  if(!payload)return;
  const title=String(payload.title||'FlexKas').slice(0,100),body=String(payload.body||'Buka FlexKas untuk melihat pengingat.').slice(0,300);
  const options={body,icon:'/assets/flexkas-icon-192.png',badge:'/assets/flexkas-icon-192.png',tag:String(payload.tag||'flexkas-reminder').slice(0,100),renotify:true,silent:false,vibrate:[200,100,200],data:payload.data||{url:'/?page=dues'}};
  event.waitUntil(Promise.all([
    self.registration.showNotification(title,options),
    self.clients.matchAll({type:'window',includeUncontrolled:true}).then(windows=>windows.forEach(client=>client.postMessage({type:'FLEXKAS_REMINDER',...options.data})))
  ]));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  let target=new URL('/?page=dues',self.location.origin);
  try{const candidate=new URL(event.notification.data?.url,self.location.origin);if(candidate.origin===self.location.origin)target=candidate}catch{}
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
    const client=windows.find(w=>new URL(w.url).origin===self.location.origin);
    if(client){if('navigate'in client)await client.navigate(target.href);return client.focus()}
    return self.clients.openWindow(target.href);
  }));
});
// An open client can retire already-shown dues alerts after its own payment syncs.
self.addEventListener('message',event=>{
  if(event.data?.type!=='FLEXKAS_CLEAR_PAID'||!Array.isArray(event.data.periodIds)||typeof self.registration.getNotifications!=='function')return;
  const {userId,periodIds}=event.data;
  event.waitUntil(self.registration.getNotifications().then(rows=>rows.forEach(notification=>{
    if(notification.data?.userId===userId&&notification.data?.kind!=='test'&&periodIds.includes(notification.data?.periodId))notification.close();
  })));
});
