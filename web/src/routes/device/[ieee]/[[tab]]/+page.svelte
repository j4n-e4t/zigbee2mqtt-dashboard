<script lang="ts">
	import {
		mdiCodeBraces,
		mdiCog,
		mdiFolderMultipleOutline,
		mdiInformationOutline,
		mdiLinkVariant,
		mdiChartLine
	} from '@mdi/js';
	import { page } from '$app/state';
	import PageShell from '#lib/components/page-shell.svelte';
	import SectionTabs from '#lib/components/section-tabs.svelte';
	import HaCard from '#lib/components/ha-card.svelte';
	import Overview from '#lib/components/device/overview.svelte';
	import DeviceSettings from '#lib/components/device/settings.svelte';
	import DeviceBind from '#lib/components/device/bind.svelte';
	import DeviceReporting from '#lib/components/device/reporting.svelte';
	import DeviceGroups from '#lib/components/device/groups.svelte';
	import DeviceConsole from '#lib/components/device/console.svelte';
	import { z2m } from '#lib/z2m/store.svelte.js';
	import type { Tab } from '#lib/tabs.js';

	const ieee = $derived(page.params.ieee ?? '');
	const tabKey = $derived(page.params.tab ?? 'overview');
	const device = $derived(z2m.devices.find((d) => d.ieee_address === ieee));
	const isCoordinator = $derived(device?.type === 'Coordinator');

	const tabs = $derived<Tab[]>(
		[
			{ route: 'overview', href: `#/device/${ieee}`, label: 'Overview', icon: mdiInformationOutline },
			{ route: 'settings', href: `#/device/${ieee}/settings`, label: 'Settings', icon: mdiCog },
			{ route: 'bind', href: `#/device/${ieee}/bind`, label: 'Bindings', icon: mdiLinkVariant },
			{ route: 'reporting', href: `#/device/${ieee}/reporting`, label: 'Reporting', icon: mdiChartLine },
			{ route: 'groups', href: `#/device/${ieee}/groups`, label: 'Groups & scenes', icon: mdiFolderMultipleOutline },
			{ route: 'console', href: `#/device/${ieee}/console`, label: 'Dev console', icon: mdiCodeBraces }
		].filter((t) => !isCoordinator || t.route === 'overview' || t.route === 'bind')
	);
</script>

<PageShell>
 <a href="#/" class="mb-3 inline-flex text-primary no-underline">← Devices</a>
 <h1 class="m-0 mb-4 text-2xl font-normal">{device?.friendly_name ?? 'Device'}</h1>
 <SectionTabs items={tabs.map(t => ({key:t.route,label:t.label,href:t.href}))} active={tabKey} />

			{#if !device}
				<HaCard>
					<p class="m-0 text-muted-foreground">
						{#if z2m.devices.length}
							No device with IEEE address <code>{ieee}</code>. <a href="#/" class="text-primary">Back to devices</a>
						{:else}
							Loading…
						{/if}
					</p>
				</HaCard>
			{:else}
				{#key device.ieee_address}
					{#if tabKey === 'settings'}<DeviceSettings {device} />
					{:else if tabKey === 'bind'}<DeviceBind {device} />
					{:else if tabKey === 'reporting'}<DeviceReporting {device} />
					{:else if tabKey === 'groups'}<DeviceGroups {device} />
					{:else if tabKey === 'console'}<DeviceConsole {device} />
					{:else}<Overview {device} />
					{/if}
				{/key}
			{/if}
</PageShell>
