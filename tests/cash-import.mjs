import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCashWorkbook, paidForMember, cashBalance, weekKey, chooseWeek } from '../src/cash-import.js';
const serial=s=>Math.round((Date.parse(s)-Date.UTC(1899,11,30))/86400000);
function fixture(){
  const kas={B10:'Anggota',D7:5000,G7:0,E7:2026,B7:2,D20:15000,H20:4000,D21:11000};
  for(let r=11;r<=15;r++){kas['B'+r]='Member '+r;kas['H'+r]=r===11?15000:0}
  for(const [year,first,last,start]of[[2026,27,36,'2026-10-23'],[2027,49,101,'2027-01-01']]){
    for(let r=first;r<=last;r++){kas['A'+r]=r-first+1;kas['B'+r]=serial(start)+(r-first)*7;kas['C'+r]=Math.min(kas['B'+r]+6,serial(`${year}-12-31`))}
  }
  const payments={B7:'Jenis',F7:'Nominal (Rp)'};
  for(const [r,kind,week,amount]of[[8,'Setoran',1,10000],[9,'Setoran',2,5000],[10,'Pengeluaran',2,4000]]){
    for(const [col,v]of Object.entries({A:serial('2026-11-02'),B:kind,C:'Member 11',D:2026,E:week,F:amount,G:'Catatan'}))payments[col+r]=v;
  }
  return{kas,payments};
}
test('weekly payments retain original allocation and excess is not rolled forward',()=>{
  const{kas,payments}=fixture(),s=parseCashWorkbook(kas,payments);
  assert.equal(s.members.length,5);assert.equal(s.transactions.length,3);assert.equal(s.duesPeriods.length,63);
  assert.equal(s.weeklyDues,5000);assert.equal(paidForMember(s,'excel-member-11','2026-W01'),10000);
  assert.equal(paidForMember(s,'excel-member-11','2026-W02'),5000);
  assert.equal(paidForMember(s,'excel-member-11','2026-W03'),0);assert.equal(cashBalance(s),11000);
  assert.equal(chooseWeek(s,'2026-11-02'),'2026-W02');assert.equal(s.transactions[2].recordedBy,'Member 11');
});
test('partial payments sum within the same week',()=>{
  const{kas,payments}=fixture();payments.F8=2500;payments.E9=1;payments.F9=1000;
  kas.D20=3500;kas.H20=0;kas.D21=3500;kas.H11=3500;for(const c of 'ABCDEFG')delete payments[c+'10'];
  const s=parseCashWorkbook(kas,payments);assert.equal(paidForMember(s,s.members[0].id,weekKey(2026,1)),3500);
});
test('reject invalid members, incomplete rows and stale workbook totals',()=>{
  let f=fixture();f.payments.C8='Unknown';assert.throws(()=>parseCashWorkbook(f.kas,f.payments),/Baris 8/);
  f=fixture();delete f.payments.F8;assert.throws(()=>parseCashWorkbook(f.kas,f.payments),/Baris 8/);
  f=fixture();f.kas.D21=999;assert.throws(()=>parseCashWorkbook(f.kas,f.payments),/saldo tidak cocok/);
  f=fixture();f.payments.E8=11;assert.throws(()=>parseCashWorkbook(f.kas,f.payments),/minggu iuran tidak valid/);
});
test('year boundary and final one-day week match workbook calendar',()=>{
  const{kas,payments}=fixture(),s=parseCashWorkbook(kas,payments);
  assert.equal(s.duesPeriods[9].end,'2026-12-31');assert.equal(s.duesPeriods[10].start,'2027-01-01');
  assert.deepEqual(s.duesPeriods.at(-1),{id:'2027-W53',year:2027,week:53,start:'2027-12-31',end:'2027-12-31'});
});
