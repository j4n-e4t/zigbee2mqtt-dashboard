<script lang="ts">
	import { mdiArrowLeft, mdiZigbee } from '@mdi/js';
	import { page } from '$app/state';
	import HaIcon from './ha-icon.svelte';
	import ConnectionStatus from './connection-status.svelte';
	import PermitJoin from './permit-join.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';
	import { TABS, activeTab, type Tab } from '#lib/tabs.js';

	// hass-tabs-subpage: toolbar icon (or back arrow) + centered tabs on desktop; on narrow screens the
	// active tab's name (or `title`) becomes the title and the tabs move to a bottom bar.
	let {
		tabs = TABS,
		active: activeKey,
		backHref,
		title
	}: { tabs?: Tab[]; active?: string; backHref?: string; title?: string } = $props();

	const active = $derived(activeKey ? (tabs.find((t) => t.route === activeKey) ?? tabs[0]) : activeTab(page.route.id, tabs));
</script>

<header
	class="flex h-[var(--header-height)] shrink-0 items-center border-b border-[var(--divider-color)] bg-[var(--sidebar-background-color)] text-[length:var(--ha-font-size-xl)] {ha.narrow
		? 'p-1'
		: 'px-3 py-2'}"
>
	{#if backHref}
		<a href={backHref} aria-label="Back" title="Back" class="ha-icon-button">
			<HaIcon path={mdiArrowLeft} />
		</a>
	{:else}
		<div class="grid size-12 shrink-0 place-items-center text-icon">
			<HaIcon path={mdiZigbee} />
		</div>
	{/if}
	{#if ha.narrow || tabs.length < 2}
		<h1 class="m-0 ms-2 min-w-0 flex-1 truncate text-[length:inherit] leading-[var(--ha-line-height-normal)] font-normal">
			{title ?? active.label}
		</h1>
	{:else}
		<nav class="-my-2 flex h-[var(--header-height)] min-w-0 flex-1 justify-center self-start text-[length:var(--ha-font-size-m)]" aria-label="Sections">
			{#each tabs as tab (tab.href)}
				<a
					href={tab.href}
					aria-current={tab === active ? 'page' : undefined}
					class="relative flex h-full max-w-[45%] min-w-0 items-center justify-center gap-2 px-5 whitespace-nowrap no-underline xl:px-8 {tab === active
						? 'text-primary shadow-[inset_0_-2px_0_var(--primary-color)]'
						: 'text-[var(--sidebar-text-color)]'}"
				>
					<HaIcon path={tab.icon} />
					<span class="truncate">{tab.label}</span>
				</a>
			{/each}
		</nav>
	{/if}
	<div class="flex shrink-0 items-center gap-2">
		{#if !backHref}<PermitJoin />{/if}
		<ConnectionStatus showVersion={!ha.narrow && !backHref} />
	</div>
</header>
