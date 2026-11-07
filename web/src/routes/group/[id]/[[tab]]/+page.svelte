<script lang="ts">
 import {page} from '$app/state';
 import PageShell from '#lib/components/page-shell.svelte';
 import HaCard from '#lib/components/ha-card.svelte';
 import SectionTabs from '#lib/components/section-tabs.svelte';
 import GroupEditor from '#lib/components/group-editor.svelte';
 import {z2m} from '#lib/z2m/store.svelte.js';
 const group=$derived(z2m.groups.find(g=>String(g.id)===page.params.id));
 const section=$derived(page.params.tab??'overview');
 const items=$derived(['overview','members','scenes','options'].map(key=>({key,label:key[0].toUpperCase()+key.slice(1),href:`#/group/${page.params.id}/${key}`})));
</script>
<PageShell>
 <a href="#/groups" class="mb-3 inline-flex text-primary no-underline">← Groups</a>
 <h1 class="m-0 mb-4 text-2xl font-normal">{group?.friendly_name??'Group'}</h1>
 <SectionTabs {items} active={section}/>
 {#if group}<GroupEditor {group} {section}/>{:else}<HaCard><p class="m-0 text-muted-foreground">{z2m.status==='open'?'Group not found.':'Loading…'}</p></HaCard>{/if}
</PageShell>
