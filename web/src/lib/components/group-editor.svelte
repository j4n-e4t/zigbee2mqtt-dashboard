<script lang="ts">
 import HaCard from './ha-card.svelte';
 import SchemaForm, {type JsonSchema} from './schema-form.svelte';
 import {z2m} from '#lib/z2m/store.svelte.js';
 import {confirm,run} from '#lib/ui.svelte.js';
 import {clone,diffOptions} from '#lib/z2m/options.js';
 import type {Group} from '#lib/z2m/types.js';
 let {group,section='overview'}:{group:Group;section?:string}=$props();
 let name=$state(''), member=$state(''), endpoint=$state('1'), sceneId=$state(0), sceneName=$state(''), busy=$state(false);
 let draft=$state<Record<string,unknown>>({}), original=$state<Record<string,unknown>>({});
 const info=$derived(z2m.info as unknown as {config?:{groups?:Record<string,Record<string,unknown>>};config_schema?:JsonSchema & {definitions?:Record<string,JsonSchema>}} | null);
 const schema=$derived(info?.config_schema?.definitions?.group);
 const selected=$derived(z2m.devices.find(d=>d.ieee_address===member));
 $effect(()=>{name=group.friendly_name;});
 $effect(()=>{const snapshot=clone(info?.config?.groups?.[group.id]??{});original=snapshot;draft=clone(snapshot);});
 $effect(()=>{endpoint=Object.keys(selected?.endpoints??{})[0]??'1';});
 const changes=$derived(diffOptions(original,draft));
 async function request(op:string,payload:Record<string,unknown>,danger=false){
  if(danger && !await confirm({title:'Remove from group?',confirmText:'Remove',destructive:true}))return;
  busy=true; const result=await run(()=>z2m.request(op,payload),'Group updated'); busy=false;
  if(op==='group/remove' && result!==undefined) location.hash='/groups';
 }
 async function scene(op:string,id=sceneId){
  if(op==='scene_remove' && !await confirm({title:'Remove scene?',confirmText:'Remove',destructive:true}))return;
  await run(async()=>{z2m.send(`${group.friendly_name}/set`,{[op]:op==='scene_store'?{ID:id,name:sceneName||`Scene ${id}`}:id});},'Scene command sent');
 }
</script>
<HaCard header={section === 'members' ? 'Members' : section === 'scenes' ? 'Scenes' : section === 'options' ? 'Options' : 'Group details'}>
 <div class="grid gap-5">
  {#if section === 'overview'}
  <form class="flex flex-wrap items-end gap-2" onsubmit={e=>{e.preventDefault();void request('group/rename',{from:group.friendly_name,to:name});}}>
   <label class="grid gap-1">Name<input class="ha-input" bind:value={name} required /></label>
   <button class="ha-button" disabled={busy||name===group.friendly_name||group.friendly_name==='default_bind_group'}>Rename</button>
   <button type="button" class="ha-button" data-variant="danger" disabled={busy||group.friendly_name==='default_bind_group'} onclick={()=>request('group/remove',{id:String(group.id)},true)}>Delete group</button>
  </form>
  <p class="m-0 text-muted-foreground">Group {group.id} · {group.members.length} members · {group.scenes.length} scenes</p>
  {/if}
  {#if section === 'members'}
  <div>
   {#each group.members as m (`${m.ieee_address}/${m.endpoint}`)}
    <div class="flex items-center justify-between gap-2 py-1"><span>{z2m.devices.find(d=>d.ieee_address===m.ieee_address)?.friendly_name??m.ieee_address} · endpoint {m.endpoint}</span><button class="ha-button" data-appearance="plain" disabled={busy} onclick={()=>request('group/members/remove',{group:String(group.id),device:m.ieee_address,endpoint:m.endpoint},true)}>Remove</button></div>
   {:else}<p class="text-muted-foreground">No members yet.</p>{/each}
   <form class="flex flex-wrap items-end gap-2" onsubmit={e=>{e.preventDefault();void request('group/members/add',{group:String(group.id),device:member,endpoint});}}>
    <label class="grid gap-1">Device<select class="ha-input" bind:value={member} required><option value="">Choose device</option>{#each z2m.devices.filter(d=>d.type!=='Coordinator') as d}<option value={d.ieee_address}>{d.friendly_name}</option>{/each}</select></label>
    <label class="grid gap-1">Endpoint<select class="ha-input" bind:value={endpoint}>{#each Object.keys(selected?.endpoints??{'1':{}}) as ep}<option>{ep}</option>{/each}</select></label>
    <button class="ha-button" disabled={busy||!member}>Add member</button>
   </form>
  </div>
  {/if}
  {#if section === 'scenes'}
  <div>
   <div class="flex flex-wrap gap-2 mb-3"><button class="ha-button" onclick={()=>run(async()=>{z2m.send(`${group.id}/set`,{state:'ON'});},'Group command sent')}>All on</button><button class="ha-button" onclick={()=>run(async()=>{z2m.send(`${group.id}/set`,{state:'OFF'});},'Group command sent')}>All off</button></div>
   {#each group.scenes as s (s.id)}<div class="flex items-center gap-2 py-1"><span class="flex-1">{s.name} ({s.id})</span><button class="ha-button" data-appearance="plain" onclick={()=>scene('scene_recall',s.id)}>Recall</button><button class="ha-button" data-appearance="plain" onclick={()=>scene('scene_remove',s.id)}>Remove</button></div>{/each}
   <form class="flex flex-wrap items-end gap-2" onsubmit={e=>{e.preventDefault();void scene('scene_store');}}>
    <label class="grid gap-1">Scene ID<input class="ha-input w-24" type="number" min="0" max="255" bind:value={sceneId} required /></label>
    <label class="grid gap-1">Scene name<input class="ha-input" bind:value={sceneName} /></label>
    <button class="ha-button" disabled={group.scenes.some(s=>s.id===sceneId)}>Store current state</button>
   </form>
  </div>
  {/if}
  {#if section === 'options' && schema}<div><SchemaForm {schema} root={info?.config_schema} bind:value={draft} disabled={busy}/><button class="ha-button mt-3" disabled={busy||!Object.keys(changes).length} onclick={()=>request('group/options',{id:String(group.id),options:changes})}>Save options</button></div>{/if}
 </div>
</HaCard>
