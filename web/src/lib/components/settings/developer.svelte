<script lang="ts">
 import HaCard from '../ha-card.svelte';
 import { z2m } from '#lib/z2m/store.svelte.js';
 import { run } from '#lib/ui.svelte.js';
 let operation = $state('health_check');
 let payload = $state('{}');
 let response = $state('');
 let busy = $state(false);
 async function send() {
  busy = true;
  await run(async () => {
   const body: unknown = JSON.parse(payload);
   if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Payload must be a JSON object');
   const result = await z2m.request(operation.trim(),body as Record<string,unknown>, {timeoutMs:180_000});
   response = JSON.stringify(result,null,2);
  },'Request completed');
  busy = false;
 }
</script>
<HaCard header="Bridge request console">
 <p class="m-0 mb-4 text-muted-foreground">Send a Zigbee2MQTT bridge request. Requests execute immediately and can change your network.</p>
 <form class="grid gap-3" onsubmit={event => {event.preventDefault(); void send();}}>
  <label class="grid gap-1">Operation (after bridge/request/)<input class="ha-input" bind:value={operation} required disabled={busy} /></label>
  <label class="grid gap-1">JSON payload<textarea class="ha-input font-mono" rows="10" bind:value={payload} disabled={busy}></textarea></label>
  <button class="ha-button justify-self-start" disabled={busy || !operation.trim()}>{busy ? 'Waiting for bridge…' : 'Send request'}</button>
 </form>
 {#if response}<pre class="overflow-auto whitespace-pre-wrap" aria-live="polite">{response}</pre>{/if}
</HaCard>
