// Build images first. Exercise only a private fake bridge, never a real network.
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from '../mock/node_modules/ws/wrapper.mjs';
const data=mkdtempSync(join(tmpdir(),'z2m-smoke-'));
writeFileSync(join(data,'options.json'),JSON.stringify({z2m_url:'http://mock:8080',z2m_token:'smoke-test-token'}));
const prefix=`z2m-release-test-${process.pid}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try {
 docker('network','create',prefix);
 docker('run','-d','--name',`${prefix}-mock`,'--network',prefix,'--network-alias','mock','-e','AUTH_TOKEN=smoke-test-token','z2m-mock:release-test');
 docker('run','-d','--name',`${prefix}-app`,'--network',prefix,'-p','127.0.0.1::80','-v',`${data}:/data:ro`,'z2m-dashboard:0.0.1-test');
 const port=docker('port',`${prefix}-app`,'80').split(':').at(-1);
 const base=`http://127.0.0.1:${port}`;
 let config;
 for(let attempt=0;attempt<40;attempt++){
  try {const response=await fetch(`${base}/config.js`); if(response.ok){config=await response.text();break;}}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 assert.ok(config?.includes("new URL('api', document.baseURI)"));
 assert.ok(!config.includes('smoke-test-token'));
 assert.equal((await fetch(base)).status,200);
 await new Promise((resolve,reject)=>{
  const socket=new WebSocket(`ws://127.0.0.1:${port}/api`);
  const timeout=setTimeout(()=>{socket.terminate();reject(new Error('WebSocket proxy timeout'));},5000);
  socket.on('error',reject);
  socket.on('message',raw=>{const message=JSON.parse(raw);if(message.topic==='bridge/info'){assert.ok(message.payload.version);clearTimeout(timeout);socket.close();resolve();}});
 });
 console.log('Container HTTP, runtime config and WebSocket proxy passed');
} finally {
 for(const name of [`${prefix}-app`,`${prefix}-mock`])try{docker('rm','-f',name);}catch{}
 try{docker('network','rm',prefix);}catch{}
 rmSync(data,{recursive:true,force:true});
}
