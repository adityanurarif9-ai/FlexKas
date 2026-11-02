import test from 'node:test';
import assert from 'node:assert/strict';
import {initialTeam,applyTeamRoles} from '../src/team.js';
import {paidForMember,cashBalance} from '../src/cash-import.js';
import {monthPeriods,paymentPlan,createDuesPayment} from '../src/dues-payment.js';
import {annualReportData} from '../src/annual-report.js';
import {annualReportCsv} from '../src/annual-view.js';
import {reminderTargets} from '../src/account-policy.js';

test('monthly package follows four or five Fridays and skips full/part-paid weeks correctly',()=>{
  const state=initialTeam();
  const november=monthPeriods(state,'2026-11');assert.equal(november.length,4);
  assert.equal(monthPeriods(state,'2027-01').length,5);
  state.transactions=[{id:'full',type:'income',category:'Iuran',memberId:'flexbox-adit',duesPeriod:november[0].id,date:'2026-10-31',amount:7000},{id:'partial',type:'income',category:'Iuran',memberId:'flexbox-adit',duesPeriod:november[1].id,date:'2026-11-01',amount:2000}];
  const plan=paymentPlan(state,'flexbox-adit',november.map(p=>p.id));
  assert.equal(plan.total,13000);assert.equal(plan.skipped,1);assert.equal(plan.payable.length,3);
  let id=0;const result=createDuesPayment(state,{memberId:'flexbox-adit',periodIds:november.map(p=>p.id),date:'2026-11-02'},()=>`payment-${++id}`);
  assert.equal(result.records.length,3);assert.equal(cashBalance(result.state)-cashBalance(state),13000);
  assert.equal(state.transactions.length,2);assert.equal(new Set(result.records.map(t=>t.batchId)).size,1);
  for(const period of november)assert.ok(paidForMember(result.state,'flexbox-adit',period.id)>=5000);
  assert.equal(paidForMember(result.state,'flexbox-adit','2026-W02'),0); // No implicit movement to October's Friday.
  assert.equal(reminderTargets(result.state,[{member_key:'adit',access_role:'viewer'}],'2026-11-13').length,0);
  assert.throws(()=>createDuesPayment(result.state,{memberId:'flexbox-adit',periodIds:november.map(p=>p.id),date:'2026-11-02'}),/sudah lunas/);
});

test('manual weeks span years, preserve payment date, and reject duplicate/invalid allocation',()=>{
  const state=initialTeam();let id=0;
  const result=createDuesPayment(state,{memberId:'flexbox-bima',periodIds:['2026-W10','2027-W01'],date:'2026-12-20'},()=>`id-${++id}`);
  assert.equal(result.plan.total,10000);assert.ok(result.records.every(t=>t.date==='2026-12-20'));
  assert.equal(annualReportData(result.state,2026).income,10000);
  assert.equal(annualReportData(result.state,2027).income,0);
  assert.equal(annualReportData(result.state,2027).members.find(m=>m.member.name==='Bima').paid,5000);
  assert.throws(()=>paymentPlan(state,'flexbox-bima',['2026-W01','2026-W01']),/berulang/);
  assert.throws(()=>paymentPlan(state,'outsider',['2026-W01']),/Pilih anggota/);
  assert.throws(()=>paymentPlan(state,'flexbox-bima',['2030-W01']),/tidak ditemukan/);
  assert.throws(()=>createDuesPayment(state,{memberId:'flexbox-bima',periodIds:['2026-W01'],date:'2026-02-30'}),/Tanggal/);
});

test('annual balances carry previous years, include 12 months, and keep surplus in its own week',()=>{
  const state=initialTeam();state.openingBalance=100;
  state.transactions=[{id:'older',type:'income',date:'2025-12-31',amount:1000},{id:'in',type:'income',date:'2026-01-01',amount:7000,category:'Iuran',memberId:'flexbox-adit',duesPeriod:'2026-W01'},{id:'out',type:'expense',date:'2026-12-31',amount:500},{id:'future',type:'income',date:'2027-01-01',amount:900}];
  const report=annualReportData(state,2026);
  assert.equal(report.opening,1100);assert.equal(report.closing,7600);assert.equal(report.income,7000);assert.equal(report.expense,500);assert.equal(report.months.length,12);
  assert.equal(report.months[1].opening,8100);assert.equal(report.months[11].closing,7600);
  const adit=report.members.find(row=>row.member.name==='Adit');assert.equal(adit.target,50000);assert.equal(adit.remaining,45000);assert.equal(adit.extra,2000);
  assert.equal(annualReportData(state,2027).opening,7600);
  const csv=annualReportCsv(report);assert.ok(csv.includes('2026-12'));assert.ok(csv.includes('Sisa target termasuk minggu mendatang'));assert.ok(csv.includes('"Keamanan"'));assert.ok(csv.includes('"Kreatif"'));
});

test('role label update preserves financial records and member IDs',()=>{
  const state=initialTeam();state.teamRosterVersion=1;state.members=state.members.map(member=>({...member,role:'Anggota'}));
  const updated=applyTeamRoles(state);
  assert.equal(updated.members[2].role,'Keamanan');assert.equal(updated.members[3].role,'Kreatif');assert.strictEqual(updated.transactions,state.transactions);assert.deepEqual(updated.members.map(m=>m.id),state.members.map(m=>m.id));
});
