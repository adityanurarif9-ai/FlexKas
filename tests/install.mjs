import test from 'node:test';
import assert from 'node:assert/strict';
import {installPlatform,readInstallState,shouldOfferInstall,SNOOZE_MS,INSTALLED_HINT_MS} from '../src/install-policy.js';
const now=1900000000000;
test('first phone visit is offered installation without waiting for native support',()=>{
  assert.equal(shouldOfferInstall({mobile:true,standalone:false,now}),true);
  assert.equal(shouldOfferInstall({mobile:false,standalone:false,now}),false);
});
test('installed display mode and repeated offers in one visit are suppressed',()=>{
  assert.equal(shouldOfferInstall({mobile:true,standalone:true,now}),false);
  assert.equal(shouldOfferInstall({mobile:true,standalone:false,shownThisVisit:true,now}),false);
});
test('later snoozes for seven days and recent installation is respected',()=>{
  assert.equal(shouldOfferInstall({mobile:true,dismissedAt:now-1,now}),false);
  assert.equal(shouldOfferInstall({mobile:true,dismissedAt:now-SNOOZE_MS,now}),true);
  assert.equal(shouldOfferInstall({mobile:true,installedAt:now-1,now}),false);
  assert.equal(shouldOfferInstall({mobile:true,installedAt:now-INSTALLED_HINT_MS,now}),true);
});
test('iPhone, desktop-mode iPad, Android and desktop have distinct instructions',()=>{
  assert.equal(installPlatform({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'}),'ios');
  assert.equal(installPlatform({platform:'MacIntel',touchPoints:5}),'ios');
  assert.equal(installPlatform({userAgent:'Mozilla/5.0 (Linux; Android 15)'}),'android');
  assert.equal(installPlatform({platform:'Win32',touchPoints:0}),'desktop');
});
test('private-mode storage errors and invalid future timestamps do not break the offer',()=>{
  assert.deepEqual(readInstallState({getItem:()=>{throw Error('blocked')}},now),{dismissedAt:0,installedAt:0});
  assert.deepEqual(readInstallState({getItem:()=>JSON.stringify({dismissedAt:now+1000,installedAt:'bad'})},now),{dismissedAt:0,installedAt:0});
});
