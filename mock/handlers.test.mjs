import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBridge} from './bridge.mjs';

function setup() {
 const messages = [];
 const bridge = createBridge({broadcast:(topic,payload) => messages.push({topic,payload:structuredClone(payload)})});
 const retained = {};
 bridge.onConnect((t,p) => retained[t] = structuredClone(p));
 let sequence = 0;
 return {messages,retained, send:(topic,payload)=>bridge.onMessage(topic,payload,()=>{}), async request(op,payload = {}) {
  const transaction = `test-${++sequence}`;
  let response;
  await bridge.onMessage(`bridge/request/${op}`,{...payload,transaction},(topic,payload) => { assert.equal(topic,`bridge/response/${op.replace(/\/downgrade$/, '')}`); response = payload; });
  assert.equal(response.transaction,transaction);
  return response;
 }};
}

test('settings deep merge, reset and restart preserve unrelated settings', async () => {
 const s = setup(); const mqtt = s.retained['bridge/info'].config.mqtt;
 assert.equal((await s.request('options',{options:{advanced:{channel:20}}})).status,'ok');
 const updated = s.messages.findLast(m => m.topic === 'bridge/info').payload;
 assert.equal(updated.config.advanced.channel,20);
 assert.deepEqual(updated.config.mqtt,mqtt);
 assert.equal(updated.restart_required,true);
 await s.request('options',{options:{advanced:{channel:null}}});
 assert.equal('channel' in s.messages.findLast(m => m.topic === 'bridge/info').payload.config.advanced,false);
 await s.request('restart');
 assert.equal(s.messages.findLast(m => m.topic === 'bridge/info').payload.restart_required,false);
});

test('device rename migrates state and rejects duplicate and invalid names', async () => {
 const s = setup(); const devices = s.retained['bridge/devices'].filter(d => d.type !== 'Coordinator');
 const d = devices[0];
 assert.equal((await s.request('device/rename',{from:d.ieee_address,to:devices[1].friendly_name})).status,'error');
 assert.equal((await s.request('device/rename',{from:d.ieee_address,to:'bad/#'})).status,'error');
 assert.equal((await s.request('device/rename',{from:d.ieee_address,to:'test-renamed'})).status,'ok');
 assert.ok(s.messages.some(m => m.topic === d.friendly_name && m.payload === ''));
 assert.ok(s.messages.some(m => m.topic === 'test-renamed'));
 assert.equal(s.messages.findLast(m => m.topic === 'bridge/devices').payload.find(x => x.ieee_address === d.ieee_address).friendly_name,'test-renamed');
});

test('device options, maintenance, removal and blocklist publish consistent state', async () => {
 const s = setup(); const d = s.retained['bridge/devices'].find(d => d.type !== 'Coordinator');
 await s.request('device/options',{id:d.ieee_address,options:{description:'Updated',disabled:true}});
 let devices = s.messages.findLast(m => m.topic === 'bridge/devices').payload;
 assert.equal(devices.find(x => x.ieee_address === d.ieee_address).description,'Updated');
 assert.equal((await s.request('device/configure',{id:d.ieee_address})).status,'ok');
 assert.equal((await s.request('device/interview',{id:d.ieee_address})).status,'ok');
 assert.equal((await s.request('device/remove',{id:d.ieee_address,block:true})).status,'ok');
 devices = s.messages.findLast(m => m.topic === 'bridge/devices').payload;
 assert.ok(!devices.some(x => x.ieee_address === d.ieee_address));
 assert.ok(s.messages.findLast(m => m.topic === 'bridge/groups').payload.every(g => g.members.every(m => m.ieee_address !== d.ieee_address)));
 assert.ok(s.messages.findLast(m => m.topic === 'bridge/info').payload.config.blocklist.includes(d.ieee_address));
 assert.equal((await s.request('device/configure',{id:d.ieee_address})).status,'error');
 const coordinator = s.retained['bridge/devices'].find(d => d.type === 'Coordinator');
 assert.equal((await s.request('device/remove',{id:coordinator.ieee_address})).status,'error');
});

test('permit join can be started and cancelled', async () => {
 const s = setup();
 assert.equal((await s.request('permit_join',{time:10})).status,'ok');
 assert.equal(s.messages.findLast(m => m.topic === 'bridge/info').payload.permit_join,true);
 await s.request('permit_join',{time:0});
 assert.equal(s.messages.findLast(m => m.topic === 'bridge/info').payload.permit_join,false);
 assert.equal((await s.request('permit_join',{time:-1})).status,'error');
});

test('tools return an archive and reject empty install codes', async () => {
 const s = setup();
 assert.deepEqual((await s.request('health_check')).data,{healthy:true});
 assert.equal((await s.request('install_code/add',{value:''})).status,'error');
 assert.equal((await s.request('install_code/add',{value:'mock-install-code'})).status,'ok');
 const result = await s.request('backup');
 const zip = Buffer.from(result.data.zip,'base64');
 assert.equal(zip.readUInt32LE(0),0x04034b50);
 const length = zip.readUInt32LE(18), nameLength = zip.readUInt16LE(26);
 const config = JSON.parse(zip.subarray(30 + nameLength,30 + nameLength + length));
 assert.deepEqual(config.mqtt,s.retained['bridge/info'].config.mqtt);
 assert.equal(zip.readUInt32LE(zip.length - 22),0x06054b50);
});

test('groups support creation, rename, membership, scenes, options and removal',async()=>{
 const s=setup();const d=s.retained['bridge/devices'].find(d=>d.type!=='Coordinator'&&Object.keys(d.endpoints??{}).length);
 const created=await s.request('group/add',{friendly_name:'Test group'});assert.equal(created.status,'ok');const id=created.data.id;
 assert.equal((await s.request('group/add',{friendly_name:'Test group'})).status,'error');
 assert.equal((await s.request('group/add',{friendly_name:'Other',id})).status,'error');
 const endpoint=Object.keys(d.endpoints)[0];
 await s.request('group/members/add',{group:String(id),device:d.ieee_address,endpoint});
 await s.request('group/members/add',{group:String(id),device:d.ieee_address,endpoint});
 assert.equal(s.messages.findLast(m=>m.topic==='bridge/groups').payload.find(g=>g.id===id).members.length,1);
 assert.equal((await s.request('group/members/add',{group:id,device:d.ieee_address,endpoint:999})).status,'error');
 await s.send(`${id}/set`,{state:'ON'});
 await s.send('Test group/set',{scene_store:{ID:3,name:'Evening'}});
 await s.send(`${id}/set`,{state:'OFF'});
 await s.send('Test group/set',{scene_recall:3});
 assert.equal(s.messages.findLast(m=>m.topic===d.friendly_name).payload.state,'ON');
 await s.send('Test group/set',{scene_remove:3});
 assert.equal(s.messages.findLast(m=>m.topic==='bridge/groups').payload.find(g=>g.id===id).scenes.length,0);
 await s.request('group/options',{id,options:{qos:1}});
 assert.equal(s.messages.findLast(m=>m.topic==='bridge/info').payload.config.groups[id].qos,1);
 await s.request('group/rename',{from:'Test group',to:'Renamed group'});
 await s.request('group/members/remove',{group:id,device:d.ieee_address,endpoint});
 assert.equal(s.messages.findLast(m=>m.topic==='bridge/groups').payload.find(g=>g.id===id).members.length,0);
 await s.request('group/remove',{id});
 assert.ok(!s.messages.findLast(m=>m.topic==='bridge/groups').payload.some(g=>g.id===id));
});

test('OTA check, scheduling, progress and completion use device state publications',async()=>{
 const s=setup();const d=s.retained['bridge/devices'].find(d=>d.definition?.supports_ota);assert.ok(d);
 const id=d.ieee_address;
 assert.equal((await s.request('device/ota_update/check/downgrade',{id})).data.update_available,true);
 await s.request('device/ota_update/schedule',{id});
 assert.equal(s.messages.findLast(m=>m.topic===d.friendly_name).payload.update.state,'scheduled');
 await s.request('device/ota_update/unschedule',{id});
 assert.equal(s.messages.findLast(m=>m.topic===d.friendly_name).payload.update.state,'idle');
 const result=await s.request('device/ota_update/update',{id});assert.equal(result.status,'ok');
 assert.ok(s.messages.some(m=>m.topic===d.friendly_name&&m.payload.update?.state==='updating'));
 const u=s.messages.findLast(m=>m.topic===d.friendly_name).payload.update;assert.equal(u.state,'idle');assert.equal(u.installed_version,u.latest_version);
});

test('OTA abort cancels an in-flight update',async()=>{
 const s=setup();const id=s.retained['bridge/devices'].find(d=>d.definition?.supports_ota).ieee_address;
 const updating=s.request('device/ota_update/update',{id});
 assert.equal((await s.request('device/ota_update/update/abort',{id})).status,'ok');
 assert.equal((await updating).status,'error');
});

test('Touchlink scan, identify and reset validate their targets',async()=>{
 const s=setup();const scan=await s.request('touchlink/scan');const target=scan.data.found[0];
 assert.equal((await s.request('touchlink/identify',target)).status,'ok');
 assert.equal((await s.request('touchlink/identify',{...target,channel:99})).status,'error');
 assert.equal((await s.request('touchlink/factory_reset',target)).status,'ok');
 assert.equal((await s.request('touchlink/scan')).data.found.length,0);
 assert.equal((await s.request('action',{action:'philips_hue_factory_reset',params:{serial_numbers:['a1b2c3']}})).status,'ok');
});

test('network maps include current inventory and valid endpoints, with optional route entries',async()=>{
 const s=setup();
 const response=await s.request('networkmap',{type:'raw',routes:false});
 assert.equal(response.status,'ok');
 const map=response.data.value;
 assert.equal(map.nodes.length,s.retained['bridge/devices'].length);
 assert.ok(map.nodes.some(n=>n.type==='Coordinator'));
 const ids=new Set(map.nodes.map(n=>n.ieeeAddr));
 assert.ok(map.links.length>0);
 for(const link of map.links){assert.ok(ids.has(link.source.ieeeAddr));assert.ok(ids.has(link.target.ieeeAddr));assert.ok(link.lqi>=0&&link.lqi<=255);assert.deepEqual(link.routes,[]);}
 const routed=await s.request('networkmap',{type:'raw',routes:true});
 assert.ok(routed.data.value.links.every(l=>l.routes.length>0));
 const d=s.retained['bridge/devices'].find(d=>d.type!=='Coordinator');
 await s.request('device/rename',{from:d.ieee_address,to:'Map renamed device'});
 const updated=await s.request('networkmap',{type:'raw'});
 assert.equal(updated.data.value.nodes.find(n=>n.ieeeAddr===d.ieee_address).friendlyName,'Map renamed device');
 assert.equal((await s.request('networkmap',{type:'invalid'})).status,'error');
});
