<script lang="ts">
	import { mdiZigbee } from '@mdi/js';
	import { page } from '$app/state';
	import HaIcon from './ha-icon.svelte';
	import ConnectionStatus from './connection-status.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';
	import { TABS, activeTab } from '#lib/tabs.js';

	// hass-tabs-subpage: toolbar-icon + centered tabs on desktop; on narrow screens the active tab's
	// name becomes the title and the tabs move to a bottom bar (tabs-bottom-bar.svelte).
	const active = $derived(activeTab(page.route.id));
</script>

<header
	class="flex h-[var(--header-height)] shrink-0 items-center border-b border-[var(--divider-color)] bg-[var(--sidebar-background-color)] text-[length:var(--ha-font-size-xl)] {ha.narrow
		? 'p-1'
		: 'px-3 py-2'}"
>
	<div class="grid size-12 shrink-0 place-items-center text-icon">
		<HaIcon path={mdiZigbee} />
	</div>
	{#if ha.narrow}
		<h1 class="m-0 ms-2 min-w-0 flex-1 truncate text-[length:inherit] leading-[var(--ha-line-height-normal)] font-normal">
			{active.label}
		</h1>
	{:else}
		<nav class="-my-2 flex h-[var(--header-height)] flex-1 justify-center self-start text-[length:var(--ha-font-size-m)]" aria-label="Sections">
			{#each TABS as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab === active ? 'page' : undefined}
					class="relative flex h-full max-w-[45%] items-center justify-center gap-2 px-8 whitespace-nowrap no-underline {tab === active
						? 'text-primary shadow-[inset_0_-2px_0_var(--primary-color)]'
						: 'text-[var(--sidebar-text-color)]'}"
				>
					<HaIcon path={tab.icon} />
					<span class="truncate">{tab.label}</span>
				</a>
			{/each}
		</nav>
	{/if}
	<ConnectionStatus showVersion={!ha.narrow} />
</header>
