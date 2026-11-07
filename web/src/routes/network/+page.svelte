<script lang="ts">
 import * as Table from '#lib/components/ui/table/index.js';
 import PageShell from '#lib/components/page-shell.svelte';
 import HaCard from '#lib/components/ha-card.svelte';
 import { z2m } from '#lib/z2m/store.svelte.js';
 import { network, type NetworkMap, type MapNode } from '#lib/z2m/network.svelte.js';
 import { errorMessage } from '#lib/ui.svelte.js';
 let routes = $state(false);
 let search = $state('');
 let zoom = $state(1);
 let showLqi = $state(true);
 let selected = $state<string | null>(null);
 const nodes = $derived(network.map?.nodes ?? []);
 const links = $derived(network.map?.links ?? []);
 const columns = $derived([
  nodes.filter(n => n.type === 'Coordinator'),
  nodes.filter(n => n.type === 'Router'),
  nodes.filter(n => n.type !== 'Coordinator' && n.type !== 'Router')
 ]);
 const height = $derived(Math.max(420, ...columns.map(c => c.length * 72 + 80)));
 const positions = $derived.by(() => {
  const result = new Map<string, { x: number; y: number }>();
  columns.forEach((column, i) => column.forEach((n, j) => result.set(n.ieeeAddr, { x: 140 + i * 340, y: (j + 1) * height / (column.length + 1) })));
  return result;
 });
 const query = $derived(search.trim().toLowerCase());
 const matches = (n: MapNode) => !query || `${n.friendlyName} ${n.ieeeAddr} ${n.type}`.toLowerCase().includes(query);
 const selectedNode = $derived(nodes.find(n => n.ieeeAddr === selected));
 const selectedLinks = $derived(links.filter(l => l.source.ieeeAddr === selected || l.target.ieeeAddr === selected));
 const lqi = (l: (typeof links)[number]) => l.lqi ?? l.linkquality;
 const qualityColor = (value: number | undefined) => value === undefined ? 'var(--secondary-text-color)' : value < 50 ? 'var(--error-color, #db4437)' : value < 100 ? 'var(--warning-color, #ffa600)' : 'var(--success-color, #43a047)';
 const name = (id: string) => nodes.find(n => n.ieeeAddr === id)?.friendlyName ?? id;
 async function scan() {
  if (network.scanning) return;
  network.scanning = true;
  network.error = null;
  try {
   const result = await z2m.request<{ value: NetworkMap }>('networkmap', { type: 'raw', routes }, { timeoutMs: 300_000 });
   if (!Array.isArray(result.value?.nodes) || !Array.isArray(result.value?.links)) throw new Error('Bridge returned an invalid network map');
   network.map = result.value;
   network.scannedAt = Date.now();
   selected = null;
  } catch (error) { network.error = errorMessage(error); }
  finally { network.scanning = false; }
 }
</script>

<PageShell>
 <h1 class="m-0 mb-4 text-2xl font-normal">Network map</h1>
 <div class="grid gap-4">
  <HaCard header="Network map">
   <p class="m-0 mb-4 text-muted-foreground">Scan the Zigbee neighbor tables to see reported connections. Sleeping devices may be absent; a missing link does not necessarily mean a device is offline.</p>
   <div class="flex flex-wrap items-center gap-4">
    <button class="ha-button" disabled={network.scanning || z2m.status !== 'open'} onclick={scan}>{network.scanning ? 'Scanning…' : network.map ? 'Refresh map' : 'Scan network'}</button>
    <label><input type="checkbox" bind:checked={routes} disabled={network.scanning} /> Include routing tables</label>
    {#if network.scannedAt}<span class="text-muted-foreground">Last scan: {new Date(network.scannedAt).toLocaleString()}</span>{/if}
   </div>
   {#if network.scanning}<p role="status" class="mb-0 text-muted-foreground">Scanning can take several minutes. You can switch tabs while it runs.</p>{/if}
   {#if network.error}<p role="alert" class="mb-0 text-error">{network.error} You can retry the scan; the previous map is kept.</p>{/if}
  </HaCard>
  {#if network.map}
   <HaCard header="Topology">
    <div class="mb-4 flex flex-wrap items-center gap-4">
     <label class="grid gap-1">Find device<input class="ha-input" type="search" bind:value={search} placeholder="Name or IEEE address" /></label>
     <label class="grid gap-1">Zoom {Math.round(zoom * 100)}%<input type="range" min="0.5" max="2" step="0.1" bind:value={zoom} /></label>
     <label><input type="checkbox" bind:checked={showLqi} /> Show link quality</label>
     <span class="text-muted-foreground">{nodes.length} devices · {links.length} reported links</span>
    </div>
    <div class="mb-3 flex flex-wrap gap-4 text-sm"><span>■ Coordinator</span><span>● Router</span><span>○ End device / other</span><span class="text-muted-foreground">Link quality (LQI): 0–255; higher is stronger. Click a device for details.</span></div>
    {#if !nodes.length}<p>No devices were returned by the scan.</p>{:else}
     <div class="max-h-[70vh] overflow-auto rounded-md border border-[var(--divider-color)]">
      <svg width={1000 * zoom} height={height * zoom} viewBox="0 0 1000 {height}" role="img" aria-label="Zigbee network topology" style="display:block">
       <text x="140" y="24" text-anchor="middle" fill="var(--secondary-text-color)">Coordinator</text>
       <text x="480" y="24" text-anchor="middle" fill="var(--secondary-text-color)">Routers</text>
       <text x="820" y="24" text-anchor="middle" fill="var(--secondary-text-color)">End devices</text>
       {#each links as link, i (i)}
        {@const a = positions.get(link.source.ieeeAddr)}{@const b = positions.get(link.target.ieeeAddr)}
        {@const connected = !selected || link.source.ieeeAddr === selected || link.target.ieeeAddr === selected}
        {#if a && b}
         <g opacity={connected ? 0.8 : 0.12}>
          <path d="M {a.x} {a.y} C {(a.x + b.x) / 2 + (a.x === b.x ? 100 : 0)} {a.y}, {(a.x + b.x) / 2 + (a.x === b.x ? 100 : 0)} {b.y}, {b.x} {b.y}" fill="none" stroke={qualityColor(lqi(link))} stroke-width={connected && selected ? 3 : 1.5}>
           <title>{name(link.source.ieeeAddr)} → {name(link.target.ieeeAddr)} · LQI {lqi(link) ?? 'unknown'}</title>
          </path>
          {#if showLqi}<text x={(a.x + b.x) / 2 + (a.x === b.x ? 75 : 0)} y={(a.y + b.y) / 2 - 4} text-anchor="middle" fill="var(--primary-text-color)" font-size="11" paint-order="stroke" stroke="var(--card-background-color)" stroke-width="4">{lqi(link) ?? '?'}</text>{/if}
         </g>
        {/if}
       {/each}
       {#each nodes as node (node.ieeeAddr)}
        {@const p = positions.get(node.ieeeAddr)!}
        <g transform="translate({p.x},{p.y})" opacity={matches(node) ? 1 : 0.15}>
         <a href="#/network" onclick={event => { event.preventDefault(); selected = selected === node.ieeeAddr ? null : node.ieeeAddr; }} aria-label="Inspect {node.friendlyName}">
          <title>{node.friendlyName} · {node.type} · {node.ieeeAddr}{node.failed?.length ? ' · Scan failed: ' + node.failed.join(', ') : ''}</title>
          {#if node.type === 'Coordinator'}<rect x="-14" y="-14" width="28" height="28" rx="4" fill="var(--primary-color)" stroke="var(--primary-text-color)" stroke-width={selected === node.ieeeAddr ? 4 : 1}/>{:else}<circle r={node.type === 'Router' ? 13 : 9} fill={node.type === 'Router' ? 'var(--primary-color)' : 'var(--card-background-color)'} stroke={node.failed?.length ? 'var(--error-color)' : 'var(--primary-color)'} stroke-width={selected === node.ieeeAddr ? 4 : 2}/>{/if}
          <text y="32" text-anchor="middle" fill="var(--primary-text-color)" font-size="12">{node.friendlyName.length > 32 ? node.friendlyName.slice(0, 29) + '…' : node.friendlyName}</text>
         </a>
        </g>
       {/each}
      </svg>
     </div>
    {/if}
   </HaCard>
   {#if selectedNode}
    <HaCard header={selectedNode.friendlyName}>
     <p>{selectedNode.type} · {selectedNode.ieeeAddr} · network address {selectedNode.networkAddress}</p>
     {#if selectedNode.failed?.length}<p class="text-error">Scan failures: {selectedNode.failed.join(', ')}</p>{/if}
     <a class="ha-button inline-flex no-underline" href="#/device/{encodeURIComponent(selectedNode.ieeeAddr)}">Open device</a>
     <div class="mt-4 overflow-auto"><Table.Root><Table.Header><Table.Row><Table.Head>Source</Table.Head><Table.Head>Target</Table.Head><Table.Head>LQI</Table.Head><Table.Head>Route entries</Table.Head></Table.Row></Table.Header><Table.Body>{#each selectedLinks as link, i (i)}<Table.Row><Table.Cell>{name(link.source.ieeeAddr)}</Table.Cell><Table.Cell>{name(link.target.ieeeAddr)}</Table.Cell><Table.Cell>{lqi(link) ?? 'Unknown'}</Table.Cell><Table.Cell>{link.routes?.length ?? 0}</Table.Cell></Table.Row>{:else}<Table.Row><Table.Cell colspan={4}>No reported links for this device.</Table.Cell></Table.Row>{/each}</Table.Body></Table.Root></div>
    </HaCard>
   {/if}
  {:else if !network.scanning}<HaCard><p class="m-0 text-muted-foreground">No map yet. Scan the network to load its topology.</p></HaCard>{/if}
 </div>
</PageShell>
