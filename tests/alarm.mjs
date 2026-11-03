import test from 'node:test';
import assert from 'node:assert/strict';
import {ALARM_SECONDS,createAlarmAudio,recentAlarmRows} from '../src/alarm-audio.js';

test('incoming alarm schedules alternating pulses for twelve seconds and can be stopped',async()=>{
  const tones=[],gains=[];
  const context={state:'suspended',currentTime:10,destination:{},resume:async()=>{context.state='running'},createOscillator(){const node={frequency:{},starts:[],stops:[],connect(){},disconnect(){node.disconnected=true},start(time){node.starts.push(time)},stop(time){node.stops.push(time)}};tones.push(node);return node},createGain(){const gain={gain:{setValueAtTime(){},linearRampToValueAtTime(value){gain.peak=value},exponentialRampToValueAtTime(){}},connect(){},disconnect(){gain.disconnected=true}};gains.push(gain);return gain}};
  const audio=createAlarmAudio(()=>context);
  assert.equal(audio.start(),false);assert.equal(await audio.unlock(),true);assert.equal(audio.start(),true);
  assert.equal(ALARM_SECONDS,12);assert.equal(tones.length,24);assert.deepEqual(tones.slice(0,2).map(node=>node.frequency.value),[660,880]);
  assert.ok(tones.every(node=>node.starts[0]>=10&&node.stops[0]<22));assert.ok(gains.every(gain=>gain.peak<=.14));
  audio.stop();assert.ok(tones.every(node=>node.disconnected&&node.stops.length===2));assert.ok(gains.every(node=>node.disconnected));
});

test('old reminders stay in the inbox without replaying alarms; server time handles clock skew',()=>{
  const now=Date.parse('2026-11-03T01:00:00Z');
  const rows=[{id:'fresh',createdAt:'2026-11-03T00:59:55Z'},{id:'old',createdAt:'2026-11-02T12:00:00Z'},{id:'future',createdAt:'2026-11-03T02:00:00Z'},{id:'invalid',createdAt:'bad'}];
  assert.deepEqual(recentAlarmRows(rows,now).map(row=>row.id),['fresh']);
  assert.equal(rows.length,4);
});

test('unsupported or blocked audio does not crash notifications',async()=>{
  const unavailable=createAlarmAudio(()=>null);assert.equal(await unavailable.unlock(),false);assert.equal(unavailable.start(),false);
  const blocked=createAlarmAudio(()=>({state:'suspended',resume:async()=>{throw Error('gesture required')}}));assert.equal(await blocked.unlock(),false);assert.equal(blocked.start(),false);
});
