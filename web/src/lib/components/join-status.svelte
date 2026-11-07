<script lang="ts">
 import { onMount } from 'svelte';
 import { z2m } from '#lib/z2m/store.svelte.js';
 import { joining, setPermitJoin } from '#lib/z2m/join.svelte.js';
 let now = $state(Date.now());
 onMount(() => { const timer = setInterval(() => now = Date.now(), 1000); return () => clearInterval(timer); });
 const active = $derived(!!z2m.info?.permit_join);
 const remaining = $derived(z2m.info?.permit_join_end ? Math.max(0, Math.ceil((z2m.info.permit_join_end - now) / 1000)) : null);
 const connected = $derived(z2m.status === 'open' && z2m.bridgeState !== 'offline');
</script>
{#if active || joining.pending}
 <div class="mx-4 mt-3 flex shrink-0 flex-wrap items-center gap-3 rounded-md border border-[var(--primary-color)] bg-[color-mix(in_srgb,var(--primary-color)_10%,transparent)] px-4 py-2">
  <div class="min-w-0 flex-1">
   <p class="m-0 font-medium" role="status">{joining.pending ? 'Changing joining state…' : connected ? 'Network open for joining' : 'Joining state unconfirmed — bridge disconnected'}</p>
   <p class="m-0 mt-1 text-sm text-muted-foreground">{connected ? remaining === 0 ? 'Waiting for the bridge to confirm joining has closed.' : remaining !== null ? `${remaining}s remaining. Put the new device into pairing mode.` : 'Put the new device into pairing mode.' : 'The last reported joining window was open. Reconnect to check its current state.'}</p>
  </div>
  {#if active}<button class="ha-button" data-size="s" disabled={joining.pending || !connected} onclick={() => setPermitJoin(0)}>Stop joining</button>{/if}
 </div>
{/if}
