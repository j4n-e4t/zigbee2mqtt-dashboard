// Stateful request handlers. Hardware work is simulated; state changes match bridge publications.
export function createHandlers({ db, publish, find, broadcast, deepMerge }) {
 const device = id => { const d = find.device(id); if (!d) throw new Error(`Device '${id}' does not exist`); return d; };
 const clean = (value, parent = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null || parent === 'homeassistant').map(([k,v]) => [k, clean(v,k)]));
 };
 const options = value => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid options'); return value; };
 const restartNeeded = (schema, patch) => Object.entries(patch).some(([k,v]) => schema?.properties?.[k]?.requiresRestart || (v && typeof v === 'object' && restartNeeded(schema?.properties?.[k],v)));
 const group = id => { const g=find.group(id); if(!g) throw new Error(`Group '${id}' does not exist`); return g; };
 const name = (value, entity) => {
  if(typeof value!=='string'||!value.trim()||/(^\/|\/$|[#+\x00-\x1f]|\/\d+$)/.test(value.trim())) throw new Error('Invalid friendly name');
  const n=value.trim(); if(find.entity(n)&&find.entity(n)!==entity) throw new Error('Name already in use'); return n;
 };
 const otaTimers=new Map();
 const ota = (op,p) => {
  const d=device(p.id); if(!d.definition?.supports_ota&&!p.url) throw new Error('Device does not support OTA updates without a custom source');
  const state=db.states[d.friendly_name]??={};
  const u=state.update??={installed_version:1,latest_version:2,state:'idle'};
  if(op==='update/abort') { if(!otaTimers.has(d.ieee_address)) throw new Error('No OTA update in progress'); const job=otaTimers.get(d.ieee_address); clearInterval(job.timer);otaTimers.delete(d.ieee_address);u.state='available';delete u.progress;delete u.remaining;publish.state(d.friendly_name);job.reject(new Error('OTA update aborted'));return {id:p.id}; }
  if(u.state==='updating') throw new Error('OTA update already in progress');
  if(op==='check') {u.state='available';u.latest_version=(u.installed_version??1)+1;publish.state(d.friendly_name);return {id:p.id,update_available:true};}
  if(op==='schedule'||op==='unschedule') {u.state=op==='schedule'?'scheduled':'idle';publish.state(d.friendly_name);return {id:p.id};}
  u.state='updating';u.progress=0;u.remaining=5;publish.state(d.friendly_name);
  return new Promise((resolve,reject)=>{const timer=setInterval(()=>{
   u.progress+=20;u.remaining=Math.max(0,5-u.progress/20);publish.state(d.friendly_name);
   if(u.progress>=100){clearInterval(timer);otaTimers.delete(d.ieee_address);const from={file_version:u.installed_version};u.installed_version=u.latest_version;u.state='idle';delete u.progress;delete u.remaining;publish.state(d.friendly_name);resolve({id:p.id,from,to:{file_version:u.installed_version}});}
  },100);otaTimers.set(d.ieee_address,{timer,reject});});
 };
 const touchTargets=[{ieee_address:'0x00178801abcdef00',channel:11}];
 const handlers = {
  networkmap({type, routes = false}) {
   if(type !== 'raw') throw new Error('The mock supports raw network maps only');
   const nodes = db.devices.map(d => ({ieeeAddr:d.ieee_address,friendlyName:d.friendly_name,type:d.type,networkAddress:d.network_address}));
   const coordinator=db.devices.find(d=>d.type==='Coordinator');
   const routers=db.devices.filter(d=>d.type==='Router');
   const links=[];
   for(const [i,d] of db.devices.filter(d=>d!==coordinator).entries()) {
    const parent=d.type==='Router'?coordinator:(routers[i % routers.length]??coordinator);
    if(!parent)continue;
    links.push({source:{ieeeAddr:d.ieee_address,networkAddress:d.network_address},target:{ieeeAddr:parent.ieee_address,networkAddress:parent.network_address},lqi:Math.max(0,Math.min(255,db.states[d.friendly_name]?.linkquality??150)),routes:routes?[{destinationAddress:d.network_address,nextHop:d.network_address,status:'ACTIVE'}]:[]});
   }
   return {type,routes,value:{nodes,links}};
  },
  'group/add' ({friendly_name,id}) {const n=name(friendly_name);let next=1;while(find.group(next))next++;const gid=id===undefined?next:Number(id);if(!Number.isInteger(gid)||gid<1||gid>65527||find.group(gid))throw new Error('Invalid or duplicate group ID');const g={id:gid,friendly_name:n,members:[],scenes:[]};db.groups.push(g);publish.groups();return {id:gid,friendly_name:n};},
  'group/rename'({from,to}) {const g=group(from);const old=g.friendly_name;g.friendly_name=name(to,g);db.groupStates[g.friendly_name]=db.groupStates[old]??{};delete db.groupStates[old];broadcast(old,'');publish.groups();publish.state(g.friendly_name);return {from:old,to:g.friendly_name};},
  'group/remove'({id}) {const g=group(id);db.groups=db.groups.filter(x=>x!==g);delete db.groupStates[g.friendly_name];delete db.info.config.groups?.[g.id];broadcast(g.friendly_name,'');publish.groups();return {id,force:false};},
  'group/options'({id,options:patch}) {const g=group(id);options(patch);db.info.config.groups??={};const from=db.info.config.groups[g.id]??{};const to=clean(deepMerge(from,patch));db.info.config.groups[g.id]=to;db.info.restart_required ||= restartNeeded(db.info.config_schema.definitions?.group,patch);publish.info();return {id,from,to,restart_required:!!db.info.restart_required};},
  'touchlink/scan'() {return {found:structuredClone(touchTargets)};},
  'touchlink/identify'(p) {if(!touchTargets.some(d=>d.ieee_address===p.ieee_address&&d.channel===p.channel))throw new Error('Touchlink device not found');return p;},
  'touchlink/factory_reset'(p) {const i=p.ieee_address?touchTargets.findIndex(d=>d.ieee_address===p.ieee_address&&d.channel===p.channel):0;if(i<0||!touchTargets.length)throw new Error('Touchlink device not found');return touchTargets.splice(i,1)[0];},
  action({action,params}) {if(action!=='philips_hue_factory_reset'||!params?.serial_numbers?.length||!params.serial_numbers.every(s=>/^[a-fA-F0-9]{6}$/.test(s)))throw new Error('Invalid Hue reset request');return {};},
  $set(entity,payload,{isGroup}) {
   if(!isGroup)return {};
   const consumed=Object.keys(payload).filter(k=>k.startsWith('scene_'));
   for(const k of consumed){const v=payload[k];if(k==='scene_store'){if(!Number.isInteger(v?.ID)||v.ID<0||v.ID>255)throw new Error('Invalid scene ID');entity.scenes=entity.scenes.filter(s=>s.id!==v.ID);entity.scenes.push({id:v.ID,name:v.name??`Scene ${v.ID}`});db.sceneStates??={};db.sceneStates[`${entity.id}/${v.ID}`]=structuredClone(db.groupStates[entity.friendly_name]??{});}else if(k==='scene_remove'){entity.scenes=entity.scenes.filter(s=>s.id!==v);}else if(k==='scene_recall'){db.groupStates[entity.friendly_name]=structuredClone(db.sceneStates?.[`${entity.id}/${v}`]??{});publish.state(entity.friendly_name);for(const m of entity.members){const d=device(m.ieee_address);db.states[d.friendly_name]={...db.states[d.friendly_name],...db.groupStates[entity.friendly_name]};publish.state(d.friendly_name);}}}
   if(consumed.length)publish.groups();return {consumed};
  },
  permit_join({time, device: id}) {
   if (!Number.isInteger(time) || time < 0 || time > 254) throw new Error('Invalid join duration');
   const d = id ? device(id) : undefined;
   clearTimeout(db.permitJoinTimer);
   db.info.permit_join = time > 0;
   db.info.permit_join_end = time ? Date.now() + time * 1000 : null;
   publish.info();
   if (time) { db.permitJoinTimer = setTimeout(() => { db.info.permit_join = false; db.info.permit_join_end = null; publish.info(); },time * 1000); db.permitJoinTimer.unref?.(); }
   return {time, ...(d ? {device:d.friendly_name}: {})};
  },
  options({options: patch}) {
   options(patch);
   db.info.config = clean(deepMerge(db.info.config, patch));
   db.info.restart_required ||= restartNeeded(db.info.config_schema,patch);
   publish.info(); return {restart_required: !!db.info.restart_required};
  },
  health_check() { return {healthy:true}; },
  'install_code/add'({value}) { if (typeof value !== 'string' || !value.trim()) throw new Error('Invalid install code'); publish.log('info','Mock install code accepted; no hardware was changed'); return {value}; },
  backup() { publish.log('info','Mock backup contains simulated configuration only'); return {zip: zipFile('mock-configuration.json',JSON.stringify(db.info.config,null,2)).toString('base64')}; },
  restart() { db.info.restart_required = false; publish.info(); return {}; },
  'device/rename'({from,to,homeassistant_rename = false}) {
   const d = device(from);
   if (typeof to !== 'string' || !to.trim() || /(^\/|\/$|[#+\x00-\x1f]|\/\d+$)/.test(to.trim())) throw new Error('Invalid friendly name');
   to = to.trim();
   if (find.entity(to) && to !== d.friendly_name) throw new Error(`Friendly name '${to}' is already in use`);
   const old = d.friendly_name;
   d.friendly_name = to;
   db.states[to] = db.states[old]; delete db.states[old];
   db.availability[to] = db.availability[old]; delete db.availability[old];
   const config = db.info.config.devices?.[d.ieee_address]; if (config) config.friendly_name = to;
   broadcast(old,''); publish.devices(); publish.info(); publish.state(to); publish.availability(to);
   return {from:old,to,homeassistant_rename};
  },
  'device/options'({id,options:patch}) {
   const d = device(id); options(patch);
   db.info.config.devices ??= {};
   const from = db.info.config.devices[d.ieee_address] ?? {};
   const to = clean(deepMerge(from,patch)); db.info.config.devices[d.ieee_address] = to;
   d.description = to.description; d.disabled = to.disabled ?? false;
   db.info.restart_required ||= restartNeeded(db.info.config_schema.definitions?.device,patch);
   publish.devices(); publish.info(); return {id,from,to,restart_required:!!db.info.restart_required};
  },
  'device/configure'({id}) { device(id); publish.devices(); return {id}; },
  'device/interview'({id}) {
   const d = device(id); d.interview_state = 'SUCCESSFUL'; d.interview_completed = true; d.interviewing = false;
   publish.devices(); publish.event('device_interview',{ieee_address:d.ieee_address,friendly_name:d.friendly_name,status:'successful'}); return {id};
  },
  'device/remove'({id,force = false,block = false,keep_config = false,clear_cache = false}) {
   const d = device(id); if (d.type === 'Coordinator') throw new Error('Cannot remove coordinator');
   db.devices = db.devices.filter(x => x !== d);
   for (const g of db.groups) g.members = g.members.filter(m => m.ieee_address !== d.ieee_address);
   if (!keep_config && db.info.config.devices) delete db.info.config.devices[d.ieee_address];
   if (block) db.info.config.blocklist = [...new Set([...(db.info.config.blocklist ?? []),d.ieee_address])];
   delete db.states[d.friendly_name]; delete db.availability[d.friendly_name]; broadcast(d.friendly_name,'');
   publish.devices(); publish.groups(); publish.info(); return {id,force,block,keep_config,clear_cache};
  }
 };
 for(const op of ['add','remove']) handlers[`group/members/${op}`]=p=>{
  const g=group(p.group),d=device(p.device);const endpoint=Number(p.endpoint??Object.keys(d.endpoints??{})[0]);
  if(!d.endpoints?.[endpoint])throw new Error('Invalid endpoint');
  const exists=g.members.some(m=>m.ieee_address===d.ieee_address&&m.endpoint===endpoint);
  if(op==='add'&&!exists)g.members.push({ieee_address:d.ieee_address,endpoint});
  if(op==='remove')g.members=g.members.filter(m=>m.ieee_address!==d.ieee_address||m.endpoint!==endpoint);
  publish.groups();return {...p,endpoint};
 };
 for(const op of ['check','update','schedule','unschedule','update/abort'])handlers[`device/ota_update/${op}`]=p=>ota(op,p);
 for(const op of ['check','update','schedule'])handlers[`device/ota_update/${op}/downgrade`]=p=>ota(op,p);
 return handlers;
}

// Single-file, uncompressed ZIP for a downloadable mock backup.
function zipFile(name, content) {
 const data = Buffer.from(content), filename = Buffer.from(name);
 let crc = 0xffffffff;
 for (const byte of data) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
 crc = (crc ^ 0xffffffff) >>> 0;
 const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt32LE(crc,14); local.writeUInt32LE(data.length,18); local.writeUInt32LE(data.length,22); local.writeUInt16LE(filename.length,26);
 const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt32LE(crc,16); central.writeUInt32LE(data.length,20); central.writeUInt32LE(data.length,24); central.writeUInt16LE(filename.length,28);
 const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1,8); end.writeUInt16LE(1,10); end.writeUInt32LE(central.length + filename.length,12); end.writeUInt32LE(local.length + filename.length + data.length,16);
 return Buffer.concat([local,filename,data,central,filename,end]);
}
