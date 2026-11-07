<script lang="ts">
	import type { Device } from '#lib/z2m/types.js';
	import { deviceImageSources } from '#lib/z2m/images.js';
	import generic from '#lib/assets/generic-device.svg';

	let { device, httpBase, class: className = '' }: { device: Device; httpBase: string; class?: string } =
		$props();

	const sources = $derived([...deviceImageSources(device, httpBase), generic]);
	let index = $state(0);

	// Restart the fallback chain when the device's sources change
	$effect(() => {
		void sources;
		index = 0;
	});

	const src = $derived(sources[Math.min(index, sources.length - 1)]);
</script>

<img
	{src}
	alt={device.definition?.model ?? device.friendly_name}
	loading="lazy"
	decoding="async"
	class="object-contain {className}"
	onerror={() => {
		if (index < sources.length - 1) index += 1;
	}}
/>
