<script lang="ts">
 import TableToolbar from '#lib/components/table-toolbar.svelte';
 import SortHeader from '#lib/components/sort-header.svelte';
 import PageShell from '#lib/components/page-shell.svelte';
 import HaCard from '#lib/components/ha-card.svelte';
 import * as Table from '#lib/components/ui/table/index.js';
 import {z2m} from '#lib/z2m/store.svelte.js';
 import {run} from '#lib/ui.svelte.js';
 let query=$state(''), creating=$state(false);
 let sort=$state('name'), direction=$state<'asc'|'desc'>('asc');
 function sortBy(key:string){direction=sort===key&&direction==='asc'?'desc':'asc';sort=key;}
 const rows=$derived(z2m.groups.filter(g=>`${g.friendly_name} ${g.id}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{const value=(g:typeof a)=>sort==='id'?g.id:sort==='members'?g.members.length:sort==='scenes'?g.scenes.length:g.friendly_name;const x=value(a),y=value(b);return (direction==='asc'?1:-1)*(typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y)));}));
 let name=$state(''), id=$state<number|undefined>(), busy=$state(false);
 async function add(){busy=true;const result=await run(()=>z2m.request('group/add',{friendly_name:name.trim(),...(id===undefined?{}:{id:String(id)})}),'Group created');if(result!==undefined){name='';id=undefined;creating=false;}busy=false;}
</script>
<PageShell>
 <h1 class="m-0 mb-4 text-2xl font-normal">Groups</h1>
 <TableToolbar bind:query label="Search groups" placeholder={`Search ${z2m.groups.length} groups`}><button class="ha-button" onclick={()=>creating=!creating}>{creating?'Cancel':'Create group'}</button></TableToolbar>
 {#if creating}<HaCard header="Create group" class="mb-4"><form class="flex flex-wrap items-end gap-3" onsubmit={e=>{e.preventDefault();void add();}}>
  <label class="grid gap-1">Group name<input class="ha-input" required bind:value={name}/></label>
  <label class="grid gap-1">Group ID (optional)<input class="ha-input w-40" type="number" min="1" max="65527" bind:value={id}/></label>
  <button class="ha-button" disabled={busy||!name.trim()}>Create group</button>
 </form></HaCard>{/if}
 <div class="overflow-auto rounded-lg border border-[var(--divider-color)] bg-card">
 <Table.Root><Table.Header><Table.Row>{#each [{key:'name',label:'Name'},{key:'id',label:'ID'},{key:'members',label:'Members'},{key:'scenes',label:'Scenes'}] as column}<SortHeader title={column.label} sorted={sort===column.key} {direction} onsort={()=>sortBy(column.key)}/>{/each}<Table.Head><span class="sr-only">Open</span></Table.Head></Table.Row></Table.Header>
 <Table.Body>{#each rows as group (group.id)}<Table.Row data-clickable onclick={()=>location.hash=`/group/${group.id}`}>
  <Table.Cell><a class="text-foreground no-underline" href="#/group/{group.id}">{group.friendly_name}</a></Table.Cell><Table.Cell>{group.id}</Table.Cell><Table.Cell>{group.members.length}</Table.Cell><Table.Cell>{group.scenes.length}</Table.Cell><Table.Cell><a href="#/group/{group.id}" class="ha-button" data-appearance="plain">Open</a></Table.Cell>
 </Table.Row>{:else}<Table.Row><Table.Cell colspan={5}>No groups found.</Table.Cell></Table.Row>{/each}</Table.Body></Table.Root>
 </div>
</PageShell>
