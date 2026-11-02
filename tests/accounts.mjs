import test from 'node:test';
import assert from 'node:assert/strict';
import {loginEmail,canManage,memberDues,reminderTargets,jakartaDate} from '../src/account-policy.js';
import {initialTeam} from '../src/team.js';
import {allowedEndpoint,authorizedCron} from '../server/push.js';
test('login aliases are normalized and public registration cannot choose a role',()=>{
  assert.equal(loginEmail(' Adit@FlexBoxStudio.site '),'adit@flexboxstudio.site');
  assert.equal(loginEmail('fakhri'),'fakhri@flexboxstudio.site');
  assert.throws(()=>loginEmail('outsider@example.com'));
  assert.equal(canManage({member_key:'adit',access_role:'admin'}),false);
  assert.equal(canManage({member_key:'fakhri',access_role:'admin'}),true);
});
test('only the four unpaid viewers receive reminders, on their allocated week',()=>{
  const state=initialTeam(),profiles=['adit','rainer','kiandra','bima','fakhri'].map(member_key=>({member_key,user_id:member_key,access_role:member_key==='fakhri'?'admin':'viewer'}));
  state.transactions=[{id:'x',type:'income',category:'Iuran',memberId:'flexbox-adit',duesPeriod:'2026-W02',amount:5000},{id:'y',type:'income',category:'Iuran',memberId:'flexbox-rainer',duesPeriod:'2026-W02',amount:2000},{id:'z',type:'income',category:'Iuran',memberId:'flexbox-bima',duesPeriod:'2026-W01',amount:10000}];
  const targets=reminderTargets(state,profiles,'2026-11-02');assert.deepEqual(targets.map(t=>t.profile.member_key),['rainer','kiandra','bima']);
  assert.equal(targets[0].due.remaining,3000);assert.equal(targets[2].due.remaining,5000);
  assert.equal(memberDues(state,profiles[0],'2026-11-02').status,'Lunas');
  assert.equal(reminderTargets(state,profiles,'2030-01-01').length,0);
});
test('Jakarta day boundaries and push endpoint restrictions are explicit',()=>{
  assert.equal(jakartaDate(new Date('2026-11-02T18:00:00Z')),'2026-11-03');
  assert.equal(allowedEndpoint('https://fcm.googleapis.com/fcm/send/example'),true);
  assert.equal(allowedEndpoint('https://web.push.apple.com/example'),true);
  for(const endpoint of ['https://127.0.0.1/push','http://fcm.googleapis.com/x','https://fcm.googleapis.com.attacker.test/x','https://evil.test@fcm.googleapis.com/x'])assert.equal(allowedEndpoint(endpoint),false);
  const secret='a'.repeat(32);assert.equal(authorizedCron('Bearer '+secret,secret),true);assert.equal(authorizedCron('Bearer wrong',secret),false);assert.equal(authorizedCron('Bearer short','short'),false);
});
