import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTeam} from '../src/team.js';
import {processReminders,sendToSubscriptions,authenticatedProfile} from '../server/push.js';

test('delivery only targets unpaid opted-in viewers and daily claims suppress duplicates',async()=>{
  const state=initialTeam();state.transactions=[{id:'paid',type:'income',category:'Iuran',memberId:'flexbox-adit',duesPeriod:'2026-W02',amount:5000}];
  const profiles=['adit','rainer','kiandra','bima','fakhri'].map(member_key=>({member_key,user_id:member_key}));
  const claims=new Set(),logged=[],received=[];
  const db={from(table){const q={select(){return q},eq(field,value){q[field]=value;return q},single:async()=>({data:{state}}),update(values){q.values=values;return q},then(resolve){
    if(table==='flex_profiles')return Promise.resolve({data:profiles}).then(resolve);
    if(table==='flex_push_subscriptions')return Promise.resolve({data:q.user_id==='kiandra'?[]:[{id:q.user_id,endpoint:'https://fcm.googleapis.com/'+q.user_id}]}).then(resolve);
    if(table==='flex_reminder_deliveries'){logged.push(q.values.status);return Promise.resolve({error:null}).then(resolve)}
    throw new Error('Unexpected table '+table);
  }};return q},async rpc(name,args){assert.equal(name,'flex_claim_reminder');const key=JSON.stringify(args);if(claims.has(key))return {data:false};claims.add(key);return {data:true}}};
  const deliver=async(_,subscriptions,payload)=>{received.push(payload.data.userId);assert.equal(subscriptions.length,1);assert.equal(payload.body.includes('Rp'),false);return {sent:1,failed:0}};
  const first=await processReminders(db,{date:'2026-11-02',deliver});
  assert.deepEqual(received,['rainer','bima']);assert.equal(first.notified,3);assert.equal(first.skipped,0);assert.deepEqual(logged,['sent','sent','sent']);
  const again=await processReminders(db,{date:'2026-11-02',deliver});assert.equal(again.notified,0);assert.equal(received.length,2);
});

test('expired subscriptions are pruned and untrusted endpoints never receive a request',async()=>{
  const oldPublic=process.env.VAPID_PUBLIC_KEY,oldPrivate=process.env.VAPID_PRIVATE_KEY;
  process.env.VAPID_PUBLIC_KEY='fixture';process.env.VAPID_PRIVATE_KEY='fixture';
  try{
    const removed=[],requests=[];
    const db={from:()=>({delete:()=>({eq:async(_,id)=>{removed.push(id)}})})};
    const result=await sendToSubscriptions(db,[{id:'expired',endpoint:'https://fcm.googleapis.com/expired'},{id:'bad',endpoint:'https://127.0.0.1/secret'},{id:'ok',endpoint:'https://web.push.apple.com/ok'}],{title:'Test'},{send:async subscription=>{requests.push(subscription.endpoint);if(subscription.endpoint.includes('expired'))throw {statusCode:410}}});
    assert.deepEqual(removed,['expired']);assert.equal(requests.length,2);assert.deepEqual(result,{sent:1,failed:2});
  }finally{for(const [key,value] of [['VAPID_PUBLIC_KEY',oldPublic],['VAPID_PRIVATE_KEY',oldPrivate]])value===undefined?delete process.env[key]:process.env[key]=value}
});

test('server authorization trusts the mapped user, not the requested role',async()=>{
  const db={auth:{getUser:async()=>({data:{user:{id:'trusted'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:'trusted',member_key:'adit',access_role:'admin'}})})})})};
  await assert.rejects(authenticatedProfile(db,{headers:{}}),/Masuk dahulu/);
  assert.equal((await authenticatedProfile(db,{headers:{authorization:'Bearer fixture'}})).access_role,'viewer');
});
