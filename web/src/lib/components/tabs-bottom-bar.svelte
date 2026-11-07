<script lang="ts">
	import { page } from '$app/state';
	import HaIcon from './ha-icon.svelte';
	import { TABS, activeTab, type Tab } from '#lib/tabs.js';

	// hass-tabs-subpage bottom bar (narrow): 56px, sidebar background, top divider, icon above a 12px label.
	let { tabs = TABS, active: activeKey }: { tabs?: Tab[]; active?: string } = $props();
	const active = $derived(activeKey ? (tabs.find((t) => t.route === activeKey) ?? tabs[0]) : activeTab(page.route.id, tabs));
</script>

<nav
	aria-label="Sections"
	class="flex h-[var(--header-height)] shrink-0 justify-around overflow-x-auto border-t border-[var(--divider-color)] bg-[var(--sidebar-background-color)] px-2 text-[length:var(--ha-font-size-s)]"
>
	{#each tabs as tab (tab.href)}
		<a
			href={tab.href}
			aria-current={tab === active ? 'page' : undefined}
			class="flex min-w-14 flex-1 flex-col items-center justify-center px-1 no-underline {tab === active
				? 'text-primary'
				: 'text-[var(--sidebar-text-color)]'}"
		>
			<span class="mb-1"><HaIcon path={tab.icon} /></span>
			<span class="max-w-full truncate">{tab.label}</span>
		</a>
	{/each}
</nav>
