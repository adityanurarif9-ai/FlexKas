import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {initialTeam} from '../src/team.js';
import {inboxFromHistory,visibleNotifications} from '../src/notification-policy.js';
import {notificationStore} from '../src/notification-store.js';
import {requireReminderAdmin,reminderRequest,sendTestReminder,listNotifications} from '../server/notifications.js';
import {processReminders} from '../server/push.js';

const viewer={user_id:'adit-id',member_key:'adit',access_role:'viewer'};
const admin={user_id:'fakhri-id',member_key:'fakhri',access_role:'admin'};
const history=(userId='adit-id')=>({user_id:userId,period_id:'2026-W02',day_jakarta:'2026-11-02',status:'sent',updated_at:'2026-11-02T11:00:00Z'});

test('paid dues hide normal inbox items and badges while explicit tests remain visible',()=>{
  const state=initialTeam();
  const rows=inboxFromHistory(state,viewer,[history(),history('other-id')],{user_id:'adit-id',last_test_at:'2026-11-02T12:00:00Z'});
  assert.equal(rows.length,2);assert.equal(rows[0].kind,'test');
  state.transactions=[{id:'paid',type:'income',category:'Iuran',memberId:'flexbox-adit',duesPeriod:'2026-W02',amount:5000}];
  assert.deepEqual(visibleNotifications(rows,state,viewer).map(row=>row.kind),['test']);
  assert.deepEqual(inboxFromHistory(state,viewer,[history()],null),[]);
  assert.deepEqual(visibleNotifications(rows,state,{...viewer,user_id:'other-id'}),[]);
});

test('only trusted Fakhri can send tests, including to a paid member; tests do not alter cash',async()=>{
  assert.throws(()=>requireReminderAdmin(viewer),error=>error.status===403);
  assert.throws(()=>requireReminderAdmin({...viewer,access_role:'admin'}),error=>error.status===403);
  assert.throws(()=>reminderRequest({memberKey:'adit',test:true}),error=>error.status===400);
  assert.throws(()=>reminderRequest({memberKey:'outsider'}),error=>error.status===400);
  assert.throws(()=>reminderRequest({periodId:'bad'}),error=>error.status===400);
  const sent=[],claims=[];let queried=0;
  const db={from(table){queried++;const q={select(){return q},eq(field,value){q[field]=value;return q},async maybeSingle(){assert.equal(q.member_key,'adit');return {data:{user_id:'adit-id',member_key:'adit'}}},then(resolve){assert.equal(table,'flex_push_subscriptions');assert.equal(q.user_id,'adit-id');return Promise.resolve({data:[{id:'device',endpoint:'https://fcm.googleapis.com/test'}]}).then(resolve)}};return q},async rpc(name,args){assert.equal(name,'flex_claim_push_test');claims.push(args.p_user_id);return {data:true}}};
  await assert.rejects(sendTestReminder(db,viewer,'adit'),error=>error.status===403);assert.equal(queried,0);
  const result=await sendTestReminder(db,admin,'adit',{deliver:async(_,subs,payload)=>{sent.push(payload);return {sent:1,failed:0}}});
  assert.equal(result.inbox,1);assert.equal(result.sent,1);assert.deepEqual(claims,['adit-id']);assert.equal(sent[0].data.kind,'test');assert.equal(sent[0].data.userId,'adit-id');
  db.rpc=async()=>({data:false});await assert.rejects(sendTestReminder(db,admin,'adit'),error=>error.status===429);
});

test('test inbox is created even before the recipient permits push',async()=>{
  const db={from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{user_id:'adit-id',member_key:'adit'}}),then(resolve){return Promise.resolve({data:[]}).then(resolve)}};return q},rpc:async()=>({data:true})};
  const result=await sendTestReminder(db,admin,'adit',{deliver:async()=>{throw new Error('No push should be attempted')}});
  assert.equal(result.inbox,1);assert.equal(result.sent,0);assert.equal(result.deviceRegistered,false);
});

test('normal reminders target selected unpaid account/week, reject future weeks, and never target paid users',async()=>{
  const state=initialTeam(),profiles=[{user_id:'adit-id',member_key:'adit'},{user_id:'rainer-id',member_key:'rainer'}],claims=[],logs=[];
  const db={from(table){const q={select(){return q},eq(field,value){q[field]=value;return q},single:async()=>({data:{state}}),update(value){q.values=value;return q},then(resolve){if(table==='flex_profiles')return Promise.resolve({data:profiles}).then(resolve);if(table==='flex_push_subscriptions')return Promise.resolve({data:[]}).then(resolve);if(table==='flex_reminder_deliveries'){logs.push({user:q.user_id,status:q.values.status});return Promise.resolve({error:null}).then(resolve)}throw new Error('Unexpected query')}};return q},rpc:async(_,args)=>{claims.push(args);return {data:true}}};
  const options={date:'2026-11-02',memberKey:'adit',periodId:'2026-W02',deliver:async()=>{throw new Error('No subscriptions')}};
  const result=await processReminders(db,options);assert.equal(result.notified,1);assert.equal(result.withoutDevice,1);assert.deepEqual(logs,[{user:'adit-id',status:'sent'}]);assert.equal(claims[0].p_user_id,'adit-id');
  state.transactions=[{id:'paid',type:'income',category:'Iuran',memberId:'flexbox-adit',duesPeriod:'2026-W02',amount:5000}];
  assert.equal((await processReminders(db,options)).eligible,0);assert.equal(claims.length,1);
  await assert.rejects(processReminders(db,{...options,periodId:'2026-W03'}),error=>error.status===409);
  await assert.rejects(processReminders(db,{...options,periodId:'2030-W01'}),error=>error.status===400);
});

test('notification API reader always queries the authenticated account only',async()=>{
  const state=initialTeam(),scopes=[];
  const db={from(table){const q={select(){return q},eq(field,value){if(field==='user_id')scopes.push(value);return q},order(){return q},limit(){return q},single:async()=>({data:{state}}),maybeSingle:async()=>({data:null}),then(resolve){assert.equal(table,'flex_reminder_deliveries');return Promise.resolve({data:[history(),history('other-id')]}).then(resolve)}};return q}};
  const result=await listNotifications(db,viewer);assert.equal(result.notifications.length,1);assert.ok(scopes.every(id=>id==='adit-id'));
});

test('read and sound-announced preferences stay per account and survive blocked storage',()=>{
  const data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  const adit=notificationStore('adit-id',storage),rainer=notificationStore('rainer-id',storage);
  adit.markRead(['message']);assert.equal(adit.isRead('message'),true);assert.equal(rainer.isRead('message'),false);
  adit.markAnnounced(['new']);assert.equal(adit.newUnread([{id:'new'}]).length,0);
  const blocked=notificationStore('private',{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});blocked.markRead(['private']);assert.equal(blocked.isRead('private'),true);
});

test('service worker retires paid normal alerts, retaining tests and other accounts',async()=>{
  const listeners={},closed=[];
  const notifications=[{data:{userId:'adit-id',periodId:'2026-W02',kind:'dues'},close(){closed.push('paid')}},{data:{userId:'adit-id',periodId:'2026-W02',kind:'test'},close(){closed.push('test')}},{data:{userId:'other-id',periodId:'2026-W02',kind:'dues'},close(){closed.push('other')}}];
  const self={addEventListener:(name,handler)=>listeners[name]=handler,registration:{getNotifications:async()=>notifications}};
  vm.runInNewContext(await readFile(new URL('../public/sw-push.js',import.meta.url),'utf8'),{self,URL});
  let finished;listeners.message({data:{type:'FLEXKAS_CLEAR_PAID',userId:'adit-id',periodIds:['2026-W02']},waitUntil:promise=>finished=promise});await finished;
  assert.deepEqual(closed,['paid']);
});
