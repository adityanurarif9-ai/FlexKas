// Read/announced preferences are private to the signed-in account on this device.
export function notificationStore(userId,storage){
  if(!storage){try{storage=globalThis.localStorage}catch{}}
  const prefix='flexkas:notifications:'+userId+':';
  function read(key){try{return new Set(JSON.parse(storage.getItem(prefix+key)||'[]').filter(id=>typeof id==='string'))}catch{return new Set()}}
  const seen=read('read'),announced=read('announced');
  function persist(key,set){try{storage.setItem(prefix+key,JSON.stringify([...set].slice(-500)))}catch{}}
  return {
    isRead:id=>seen.has(id),
    markRead(ids){ids.forEach(id=>seen.add(id));persist('read',seen)},
    newUnread(rows){return rows.filter(row=>!seen.has(row.id)&&!announced.has(row.id))},
    markAnnounced(ids){ids.forEach(id=>announced.add(id));persist('announced',announced)}
  };
}
