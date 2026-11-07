<script lang="ts">
	import { mdiRestart } from '@mdi/js';
	import HaIcon from '../ha-icon.svelte';
	import { z2m } from '#lib/z2m/store.svelte.js';
	import { restartBridge } from '#lib/z2m/actions.js';
</script>

{#if z2m.info?.restart_required}
	<!-- ha-alert (warning) -->
	<div role="alert" class="mb-4 flex items-center gap-3 rounded-sm bg-[color-mix(in_srgb,var(--warning-color)_14%,transparent)] py-2 pr-2 pl-3">
		<HaIcon path={mdiRestart} class="text-warning" />
		<span class="flex-1">Some changes only take effect after Zigbee2MQTT restarts.</span>
		<button type="button" class="ha-button" data-size="s" onclick={restartBridge}>Restart now</button>
	</div>
{/if}
