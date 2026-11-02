import test from 'node:test';
import assert from 'node:assert/strict';
import { TEAM, initialTeam, applyTeamRoles, prepareTeamState, teamRole } from '../src/team.js';
test('new browsers start with the real roster, weekly dues and no fabricated cash',()=>{
  const s=initialTeam();assert.deepEqual(s.members.map(m=>[m.name,m.role]),[['Adit','Leader'],['Rainer','Wakil Leader'],['Kiandra','Anggota'],['Bima','Anggota'],['Fakhri','Bendahara']]);
  assert.equal(s.transactions.length,0);assert.equal(s.openingBalance,0);assert.equal(s.weeklyDues,5000);assert.equal(s.duesPeriods.length,63);
  assert.equal(teamRole(' fakhri '),'Bendahara');assert.equal(teamRole('Rainer'),'Wakil Leader');
});
test('role migration preserves transaction allocation, IDs and all cash fields',()=>{
  const s={...initialTeam(),teamRosterVersion:undefined,members:TEAM.map((m,i)=>({...m,id:'existing-'+i,role:'Anggota'})),transactions:[{id:'payment-1',memberId:'existing-4',amount:2500,type:'income',duesPeriod:'2026-W02'}],openingBalance:700};
  const next=applyTeamRoles(s);assert.equal(next.members[4].role,'Bendahara');assert.equal(next.members[4].id,'existing-4');assert.strictEqual(next.transactions,s.transactions);assert.equal(next.openingBalance,700);
  next.members[4].role='Bendahara tim';assert.strictEqual(applyTeamRoles(next),next);
});
test('an edited legacy example is retained instead of silently deleting cash',()=>{
  const s={demo:true,monthlyDues:50000,members:[{id:'m0',name:'Edited member',role:'Admin'}],transactions:[{id:'new',amount:18000,type:'income'}]};
  const next=prepareTeamState(s);assert.equal(next.replacedDemo,false);assert.deepEqual(next.state.transactions,s.transactions);assert.equal(next.state.members[0].name,'Edited member');
});
