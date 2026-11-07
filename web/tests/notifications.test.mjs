import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBridgeNotifications} from '../src/lib/z2m/notifications.ts';

test('joining transitions notify once, including automatic closure',()=>{
 const messages=[];
 const receive=createBridgeNotifications(undefined,(message,options)=>messages.push({message,options}));
 receive('bridge/info',{permit_join:false});
 assert.equal(messages.length,0);
 receive('bridge/info',{permit_join:true,permit_join_end:Date.now()+60_000});
 receive('bridge/info',{permit_join:true});
 assert.equal(messages.length,1);
 assert.match(messages[0].message,/Joining opened/);
 receive('bridge/info',{permit_join:false});
 receive('bridge/info',{permit_join:false});
 assert.equal(messages.length,2);
 assert.match(messages[1].message,/Joining closed/);
});

test('join and interview messages include the device and actionable failure feedback',()=>{
 const messages=[];
 const receive=createBridgeNotifications(false,(message,options)=>messages.push({message,options}));
 for(const [type,status] of [['device_joined',undefined],['device_interview','started'],['device_interview','failed'],['device_interview','successful']]) receive('bridge/event',{type,data:{friendly_name:'Kitchen sensor',status}});
 assert.equal(messages.length,4);
 assert.ok(messages.every(m=>m.message.includes('Kitchen sensor')));
 assert.equal(messages[2].options.error,true);
 assert.match(messages[2].message,/retry/);
 receive('bridge/event',{type:'device_announce',data:{}});
 assert.equal(messages.length,4);
});
