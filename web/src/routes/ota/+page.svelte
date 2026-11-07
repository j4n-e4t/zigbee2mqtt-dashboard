<script lang="ts">
 import * as Table from '#lib/components/ui/table/index.js';
 import TableToolbar from '#lib/components/table-toolbar.svelte';
 import SortHeader from '#lib/components/sort-header.svelte';
 import PageShell from '#lib/components/page-shell.svelte';
 import HaCard from '#lib/components/ha-card.svelte';
 import {z2m} from '#lib/z2m/store.svelte.js';
 import {confirm,run} from '#lib/ui.svelte.js';
 import type {Device} from '#lib/z2m/types.js';
 let query=$state('');
 let sort=$state('name'), direction=$state<'asc'|'desc'>('asc');
 function sortBy(key:string){direction=sort===key&&direction==='asc'?'desc':'asc';sort=key;}
 let downgrade=$state(false), url=$state(''), showAll=$state(false);
 let pending=$state<Record<string,boolean>>({});
 const devices=$derived(z2m.devices.filter(d=>d.type!=='Coordinator'&&(showAll||d.definition?.supports_ota)&&`${d.friendly_name} ${d.definition?.model??''}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{const value=(d:Device)=>sort==='status'?update(d).state:sort==='installed'?update(d).installed_version:sort==='latest'?update(d).latest_version:d.friendly_name;const x=value(a),y=value(b);return (direction==='asc'?1:-1)*(typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??'')));}));
 type Update={state?:string;progress?:number;remaining?:number;installed_version?:number;latest_version?:number;latest_release_notes?:string};
 const update=(d:Device)=>(z2m.deviceStates[d.friendly_name]?.update??{}) as Update;
 async function action(d:Device,op:string){
  if(['update','schedule'].includes(op)&&!await confirm({title:`${op==='update'?'Start':'Schedule'} firmware ${downgrade?'downgrade':'update'}?`,text:d.friendly_name,confirmText:'Continue'}))return;
  pending[d.ieee_address]=true;
  const suffix=downgrade&&['check','update','schedule'].includes(op)?'/downgrade':'';
  await run(()=>z2m.request(`device/ota_update/${op}${suffix}`,{id:d.ieee_address,...(url.trim()&&op!=='unschedule'&&op!=='update/abort'?{url:url.trim()}:{})},{timeoutMs:op==='update'?3_600_000:180_000}),'OTA request completed');
  pending[d.ieee_address]=false;
 }
</script>
<PageShell>
 <h1 class="m-0 mb-4 text-2xl font-normal">OTA</h1><div class="grid gap-4">
 <HaCard header="Firmware updates">
  <p class="m-0 mb-4 text-muted-foreground">Check firmware availability, update now, or schedule an update for the next device request. Keep battery-powered devices awake when checking.</p>
  <div class="grid gap-3"><label><input type="checkbox" bind:checked={showAll}/> Show devices without built-in OTA support</label><label><input type="checkbox" bind:checked={downgrade}/> Allow firmware downgrade</label><label class="grid gap-1">Custom firmware index or image URL (optional)<input class="ha-input" type="url" bind:value={url}/></label></div>
 </HaCard>
 <TableToolbar bind:query label="Search firmware devices" placeholder="Search by name or model"/>
 <div class="overflow-auto rounded-lg border border-[var(--divider-color)] bg-card">
 <Table.Root><Table.Header><Table.Row>{#each [{key:'name',label:'Device'},{key:'status',label:'Status'},{key:'installed',label:'Installed'},{key:'latest',label:'Latest'}] as column}<SortHeader title={column.label} sorted={sort===column.key} {direction} onsort={()=>sortBy(column.key)}/>{/each}<Table.Head>Actions</Table.Head></Table.Row></Table.Header><Table.Body>
 {#each devices as d (d.ieee_address)}
  {@const u=update(d)}{@const blocked=!!pending[d.ieee_address]||d.interviewing||d.interview_state==='PENDING'||d.interview_state==='IN_PROGRESS'||u.state==='updating'}
  <Table.Row>
   <Table.Cell><a class="text-foreground no-underline" href="#/device/{d.ieee_address}">{d.friendly_name}</a><div class="text-sm text-muted-foreground">{d.definition?.vendor??''} {d.definition?.model??d.model_id??''}</div></Table.Cell>
   <Table.Cell>{u.state??'Not checked'}{#if u.state==='updating'}<progress class="block w-32" max="100" value={u.progress??0}></progress><span class="text-sm">{u.progress??0}% · {u.remaining??'?'}s remaining</span>{/if}{#if u.latest_release_notes}<details><summary>Release notes</summary><p class="max-w-sm whitespace-pre-wrap">{u.latest_release_notes}</p></details>{/if}</Table.Cell>
   <Table.Cell>{u.installed_version??'Unknown'}</Table.Cell><Table.Cell>{u.latest_version??'Unknown'}</Table.Cell>
   <Table.Cell><div class="flex flex-wrap gap-2">
    <button class="ha-button" data-size="s" data-appearance="plain" disabled={blocked} onclick={()=>action(d,'check')}>Check</button>
    <button class="ha-button" data-size="s" disabled={blocked||(!url.trim()&&u.state!=='available')} onclick={()=>action(d,'update')}>Update</button>
    <button class="ha-button" data-size="s" data-appearance="plain" disabled={blocked||u.state==='scheduled'} onclick={()=>action(d,'schedule')}>Schedule</button>
    {#if u.state==='scheduled'}<button class="ha-button" data-size="s" data-appearance="plain" disabled={blocked} onclick={()=>action(d,'unschedule')}>Cancel schedule</button>{/if}
    {#if u.state==='updating'}<button class="ha-button" data-size="s" onclick={()=>action(d,'update/abort')}>Abort</button>{/if}
   </div></Table.Cell>
  </Table.Row>
 {:else}<Table.Row><Table.Cell colspan={5}>No matching devices. Enable “Show devices without built-in OTA support” to use a custom source.</Table.Cell></Table.Row>{/each}
 </Table.Body></Table.Root></div>
</div></PageShell>
