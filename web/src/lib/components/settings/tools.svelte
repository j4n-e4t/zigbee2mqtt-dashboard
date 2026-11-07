<script lang="ts">
 import HaCard from '../ha-card.svelte';
 import { restartBridge } from '#lib/z2m/actions.js';
 import { z2m } from '#lib/z2m/store.svelte.js';
 import { run } from '#lib/ui.svelte.js';
 let busy = $state(false);
 let code = $state('');
 async function backup() {
  busy = true;
  await run(async () => {
   const data = await z2m.request<{zip:string}>('backup',{}, {timeoutMs:180_000});
   const bytes = Uint8Array.from(atob(data.zip),c => c.charCodeAt(0));
   const url = URL.createObjectURL(new Blob([bytes],{type:'application/zip'}));
   const a = document.createElement('a'); a.href = url; a.download = `z2m-backup-${Date.now()}.zip`; a.click();
   setTimeout(() => URL.revokeObjectURL(url),1000);
  },'Backup downloaded');
  busy = false;
 }
 async function install() {
  busy = true;
  const result = await run(() => z2m.request('install_code/add',{value:code.trim()}), 'Install code added');
  if (result !== undefined) code = '';
  busy = false;
 }
</script>
<div class="grid gap-4">
 <HaCard header="Bridge maintenance">
  <div class="flex flex-wrap gap-2">
   <button class="ha-button" disabled={busy} onclick={restartBridge}>Restart Zigbee2MQTT</button>
   <button class="ha-button" disabled={busy} onclick={backup}>{busy ? 'Working…' : 'Download backup'}</button>
  </div>
 </HaCard>
 <HaCard header="Install code">
  <form class="grid gap-3" onsubmit={event => {event.preventDefault(); void install();}}>
   <label class="grid gap-1">Install code<input class="ha-input" bind:value={code} required disabled={busy} /></label>
   <button class="ha-button justify-self-start" disabled={busy || !code.trim()}>Add install code</button>
  </form>
 </HaCard>
</div>
