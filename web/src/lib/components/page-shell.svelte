<script lang="ts">
	import type { Snippet } from 'svelte';
	import TabsToolbar from './tabs-toolbar.svelte';
	import TabsBottomBar from './tabs-bottom-bar.svelte';
	import JoinStatus from './join-status.svelte';
	import ConnectionAlert from './connection-alert.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';

	// Top-level page: tabs toolbar, connection alert, HA config-page container (max 1280px, 16px gutter,
	// 32px top margin), bottom tab bar on narrow screens.
	let { children, wide = false }: { children: Snippet; wide?: boolean } = $props();
</script>

<div class="flex h-full flex-col">
	<TabsToolbar />
	<ConnectionAlert />
	<JoinStatus />
	<div class="min-h-0 flex-1 overflow-auto">
		<div class="mx-auto px-4 py-2 {wide ? '' : 'max-w-[1280px]'} {ha.narrow ? 'mt-0' : 'my-8'}">
			{@render children()}
		</div>
	</div>
	{#if ha.narrow}<TabsBottomBar />{/if}
</div>
