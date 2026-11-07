<script lang="ts">
	import { mdiArrowLeft } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';
	import ConnectionStatus from './connection-status.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';

	// hass-subpage: 56px toolbar, 8px 12px padding, back arrow as a 48px round icon button,
	// 20px regular title at 24px (8px narrow).
	let { title, backHref = '#/' }: { title: string; backHref?: string } = $props();
</script>

<header
	class="flex h-[var(--header-height)] shrink-0 items-center bg-header px-3 py-2 text-[length:var(--ha-font-size-xl)] text-header-foreground [border-bottom:var(--app-header-border-bottom)]"
>
	<a
		href={backHref}
		aria-label="Back"
		title="Back"
		class="grid size-12 shrink-0 place-items-center rounded-full text-icon hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary"
	>
		<HaIcon path={mdiArrowLeft} />
	</a>
	<h1
		class="m-0 min-w-0 flex-1 truncate text-[length:inherit] leading-[var(--ha-line-height-normal)] font-normal {ha.narrow
			? 'ms-2'
			: 'ms-6'}"
	>
		{title}
	</h1>
	<ConnectionStatus />
</header>
