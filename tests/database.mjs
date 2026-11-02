import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createDuesPayment,monthPeriods} from '../src/dues-payment.js';

test('database enforces admin, identity, version conflicts, subscription isolation and reminder claims',async()=>{
  const db=new PGlite();
  const users={fakhri:'00000000-0000-0000-0000-000000000001',adit:'00000000-0000-0000-0000-000000000002',outsider:'00000000-0000-0000-0000-000000000003'};
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
    const migration=await readFile(new URL('../supabase/001_team_accounts.sql',import.meta.url),'utf8');
    await db.exec(migration);await db.exec(migration);
    for(const id of Object.values(users))await db.query('insert into auth.users values($1)',[id]);
    for(const key of ['fakhri','adit'])await db.query('insert into flex_profiles(user_id,member_key) values($1,$2)',[users[key],key]);
    const asUser=async(key,role='authenticated')=>{
      await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[key]||'']);await db.exec('set role '+role);
    };
    await asUser('adit');let snapshot=(await db.query('select flex_snapshot() as s')).rows[0].s;
    assert.equal(snapshot.profile.access_role,'viewer');assert.equal(snapshot.state.members.length,5);
    const state=snapshot.state;
    await assert.rejects(db.query('select flex_save_wallet($1::jsonb,0)',[JSON.stringify(state)]),/Hanya Fakhri/);
    await assert.rejects(db.exec("update flex_members set access_role='admin' where member_key='adit'"),/permission denied/);
    await assert.rejects(db.exec("update flex_profiles set member_key='fakhri'"),/permission denied/);
    await assert.rejects(db.exec("update flex_wallet set revision=99"),/permission denied/);
    await asUser('outsider');await assert.rejects(db.exec('select flex_snapshot()'),/belum diizinkan/);
    await asUser('', 'anon');await assert.rejects(db.exec('select flex_snapshot()'),/permission denied/);
    await asUser('fakhri');
    const saved=(await db.query('select flex_save_wallet($1::jsonb,0) as s',[JSON.stringify(state)])).rows[0].s;
    assert.equal(saved.revision,1);assert.equal(saved.profile.access_role,'admin');
    await assert.rejects(db.query('select flex_save_wallet($1::jsonb,0)',[JSON.stringify(state)]),/Kas sudah berubah/);
    await assert.rejects(db.query('select flex_save_wallet($1::jsonb,1)',[JSON.stringify({...state,members:state.members.slice(1)})]),/Jumlah data/);
    await assert.rejects(db.query('select flex_save_wallet($1::jsonb,1)',[JSON.stringify({...state,transactions:[{id:'e',type:'expense',title:'Expense',amount:5000,date:'2026-11-02'}]})]),/negatif/);
    let counter=0;
    const batch=createDuesPayment(state,{memberId:'flexbox-adit',periodIds:monthPeriods(state,'2026-11').map(p=>p.id),date:'2026-11-02'},()=>`batch-${++counter}`);
    const paid=(await db.query('select flex_save_wallet($1::jsonb,1) as s',[JSON.stringify(batch.state)])).rows[0].s;
    assert.equal(paid.state.transactions.length,4);assert.equal(paid.state.transactions.reduce((sum,t)=>sum+t.amount,0),20000);assert.equal(paid.revision,2);
    await assert.rejects(db.query('select flex_save_wallet($1::jsonb,1)',[JSON.stringify(batch.state)]),/Kas sudah berubah/);
    assert.equal((await db.query('select flex_snapshot() as s')).rows[0].s.state.transactions.length,4);
    await asUser('adit');
    await db.query('insert into flex_push_subscriptions(user_id,endpoint,p256dh,auth) values($1,$2,$3,$4)',[users.adit,'https://fcm.googleapis.com/test', 'k'.repeat(87),'a'.repeat(22)]);
    await assert.rejects(db.query('insert into flex_push_subscriptions(user_id,endpoint,p256dh,auth) values($1,$2,$3,$4)',[users.fakhri,'https://fcm.googleapis.com/other','k'.repeat(87),'a'.repeat(22)]),/row-level security/);
    await assert.rejects(db.query('select flex_claim_reminder($1,$2,$3)',[users.adit,'2026-W02','2026-11-02']),/permission denied/);
    await asUser('fakhri');assert.equal((await db.query('select * from flex_push_subscriptions')).rows.length,0);
    await asUser('adit','service_role');
    const claim=async()=> (await db.query('select flex_claim_reminder($1,$2,$3) as ok',[users.adit,'2026-W02','2026-11-02'])).rows[0].ok;
    assert.equal(await claim(),true);assert.equal(await claim(),false);
    await db.exec("update flex_reminder_deliveries set status='sent'");assert.equal(await claim(),false);
    await db.exec("update flex_reminder_deliveries set status='failed'");assert.equal(await claim(),true);
    const pushTest=async()=> (await db.query('select flex_claim_push_test($1) as ok',[users.adit])).rows[0].ok;
    assert.equal(await pushTest(),true);assert.equal(await pushTest(),false);
  }finally{await db.close()}
});
