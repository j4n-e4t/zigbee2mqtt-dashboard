<script lang="ts">
	import { z2m } from '#lib/z2m/store.svelte.js';

	let { showVersion = false }: { showVersion?: boolean } = $props();

	const connected = $derived(z2m.status === 'open' && z2m.bridgeState !== 'offline');
	const text = $derived(
		connected
			? 'Connected'
			: z2m.status === 'open'
				? 'Bridge offline'
				: z2m.status === 'connecting'
					? 'Connecting…'
					: z2m.status === 'unauthorized'
						? 'Unauthorized'
						: 'Disconnected'
	);
</script>

<div class="flex shrink-0 items-center gap-3 pe-1 text-[length:var(--ha-font-size-m)] text-muted-foreground" title={z2m.config.wsUrl}>
	{#if showVersion && z2m.info}
		<span>Zigbee2MQTT {z2m.info.version}</span>
	{/if}
	<span class="ha-label" data-tone={connected ? 'primary' : z2m.status === 'connecting' ? 'neutral' : 'danger'}>
		{text}
	</span>
</div>
