<script lang="ts">
	import HaCard from "#lib/components/ha-card.svelte";
	import type { Device } from "#lib/z2m/types.js";
	let { device }: { device: Device } = $props();
</script>

<HaCard header="console"><p class="m-0 text-muted-foreground">Coming next for {device.friendly_name}.</p></HaCard>
