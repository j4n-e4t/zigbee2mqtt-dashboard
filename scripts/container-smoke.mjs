// Build images first. Exercise only a private fake bridge, never a real network.
import {execFileSync} from 'node:child_process';
import {createServer,request} from 'node:http';
import {connect} from 'node:net';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import WebSocket from '../mock/node_modules/ws/wrapper.mjs';
const data=mkdtempSync(join(tmpdir(),'z2m-smoke-'));
writeFileSync(join(data,'options.json'),JSON.stringify({z2m_url:'http://mock:8080',z2m_token:'smoke-test-token'}));
const prefix=`z2m-release-test-${process.pid}`;
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
let ingress;
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
 const ingressPath='/api/hassio_ingress/test-session/';
 ingress=createServer((req,res)=>{
  if(!req.url.startsWith(ingressPath)){res.writeHead(404).end();return;}
  const upstream=request({hostname:'127.0.0.1',port,path:'/'+req.url.slice(ingressPath.length),method:req.method,headers:req.headers},reply=>{res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);});
  upstream.on('error',error=>{res.writeHead(502).end(error.message);});
  req.pipe(upstream);
 });
 ingress.on('upgrade',(req,socket,head)=>{
  if(!req.url.startsWith(ingressPath)){socket.destroy();return;}
  const upstream=connect(Number(port),'127.0.0.1',()=>{
   upstream.write(`${req.method} /${req.url.slice(ingressPath.length)} HTTP/1.1\r\n${Object.entries(req.headers).map(([k,v])=>`${k}: ${v}`).join('\r\n')}\r\n\r\n`);
   if(head.length)upstream.write(head);
   socket.pipe(upstream);upstream.pipe(socket);
  });
  upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());
 });
 await new Promise(resolve=>ingress.listen(0,'127.0.0.1',resolve));
 const ingressBase=`http://127.0.0.1:${ingress.address().port}${ingressPath}`;
 const html=await (await fetch(ingressBase)).text();
 const references=[...html.matchAll(/(?:src|href)=["']([^"']+)["']|import\(["']([^"']+)["']/g)].map(m=>m[1]??m[2]);
 assert.ok(references.length>5,'Must test real built entry resources');
 for(const reference of references){
  const asset=new URL(reference,ingressBase);
  assert.ok(asset.pathname.startsWith(ingressPath),`Asset escapes ingress: ${reference}`);
  const response=await fetch(asset);
  assert.equal(response.status,200,`Asset unavailable: ${asset}`);
  assert.ok(!response.headers.get('content-type')?.includes('text/html'),`Asset returned fallback HTML: ${asset}`);
 }
 const socketUrl=new URL('api',ingressBase);socketUrl.protocol='ws:';
 await new Promise((resolve,reject)=>{
  const socket=new WebSocket(socketUrl);
  const timeout=setTimeout(()=>{socket.terminate();reject(new Error('WebSocket proxy timeout'));},5000);
  socket.on('error',reject);
  socket.on('message',raw=>{const message=JSON.parse(raw);if(message.topic==='bridge/info'){assert.ok(message.payload.version);clearTimeout(timeout);socket.close();resolve();}});
 });
 console.log('Container HTTP, ingress bootstrap assets, runtime config and authenticated ingress WebSocket passed');
} finally {
 ingress?.close();
 ingress?.closeAllConnections();
 for(const name of [`${prefix}-app`,`${prefix}-mock`])try{docker('rm','-f',name);}catch{}
 try{docker('network','rm',prefix);}catch{}
 rmSync(data,{recursive:true,force:true});
}
