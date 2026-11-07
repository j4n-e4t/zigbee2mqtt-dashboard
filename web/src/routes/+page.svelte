<script lang="ts">
	import { onDestroy } from 'svelte';
	import * as Table from '#lib/components/ui/table/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Input } from '#lib/components/ui/input/index.js';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import DeviceImage from '#lib/components/device-image.svelte';
	import { loadConfig } from '#lib/config.js';
	import { Z2MClient } from '#lib/z2m/client.svelte.js';
	import type { Device } from '#lib/z2m/types.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down';
	import PlugIcon from '@lucide/svelte/icons/plug';
	import BatteryIcon from '@lucide/svelte/icons/battery-medium';

	const config = loadConfig();
	const z2m = new Z2MClient(config);
	z2m.connect();
	onDestroy(() => z2m.disconnect());

	let query = $state('');
	type SortKey = 'name' | 'type' | 'vendor';
	let sortKey = $state<SortKey>('name');
	let sortDir = $state<1 | -1>(1);

	const typeOrder: Record<string, number> = { Coordinator: 0, Router: 1, EndDevice: 2 };
	const sortValue = (d: Device, key: SortKey) =>
		key === 'name'
			? d.friendly_name
			: key === 'type'
				? String(typeOrder[d.type] ?? 9)
				: `${d.definition?.vendor ?? '~'} ${d.definition?.model ?? ''}`;

	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const filtered = q
			? z2m.devices.filter((d) =>
					[
						d.friendly_name,
						d.description,
						d.ieee_address,
						d.definition?.model,
						d.definition?.vendor,
						d.definition?.description,
						d.model_id,
						d.manufacturer
					].some((v) => v?.toLowerCase().includes(q))
				)
			: z2m.devices;
		return [...filtered].sort(
			(a, b) =>
				// Coordinator always on top
				(a.type === 'Coordinator' ? -1 : 0) - (b.type === 'Coordinator' ? -1 : 0) ||
				sortDir * sortValue(a, sortKey).localeCompare(sortValue(b, sortKey), undefined, { numeric: true })
		);
	});

	const counts = $derived({
		total: z2m.devices.filter((d) => d.type !== 'Coordinator').length,
		routers: z2m.devices.filter((d) => d.type === 'Router').length,
		endDevices: z2m.devices.filter((d) => d.type === 'EndDevice').length
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 1 ? -1 : 1;
		else {
			sortKey = key;
			sortDir = 1;
		}
	}

	const hex = (n: number) => `0x${n.toString(16).padStart(4, '0').toUpperCase()}`;
	const isBattery = (d: Device) => d.power_source === 'Battery';

	const statusText = $derived(
		z2m.status === 'open'
			? z2m.bridgeState === 'offline'
				? 'Bridge offline'
				: 'Connected'
			: z2m.status === 'connecting'
				? 'Connecting…'
				: z2m.status === 'unauthorized'
					? 'Unauthorized'
					: 'Disconnected'
	);
	const statusDot = $derived(
		z2m.status === 'open' && z2m.bridgeState !== 'offline'
			? 'bg-emerald-500'
			: z2m.status === 'connecting'
				? 'bg-amber-500 animate-pulse'
				: 'bg-red-500'
	);
</script>

<div class="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Zigbee devices</h1>
			<p class="text-sm text-muted-foreground">
				{#if z2m.devices.length}
					{counts.total} devices · {counts.routers} routers · {counts.endDevices} end devices
				{:else}
					Device inventory from Zigbee2MQTT
				{/if}
			</p>
		</div>
		<div class="flex items-center gap-3 text-sm text-muted-foreground">
			<span class="flex items-center gap-2" title={config.wsUrl}>
				<span class="size-2 rounded-full {statusDot}"></span>
				{statusText}
			</span>
			{#if z2m.info}
				<Badge variant="outline">Z2M {z2m.info.version}</Badge>
			{/if}
		</div>
	</header>

	{#if z2m.lastError && z2m.status !== 'open'}
		<div class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{z2m.lastError}. Check <code class="font-mono">config.js</code> /
			<code class="font-mono">Z2M_URL</code>.
		</div>
	{/if}

	<div class="relative max-w-sm">
		<SearchIcon class="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
		<Input bind:value={query} placeholder="Search name, model, vendor, IEEE…" class="pl-8" />
	</div>

	<div class="overflow-hidden rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/40 hover:bg-muted/40">
					<Table.Head class="w-20"></Table.Head>
					<Table.Head>
						<button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort('name')}>
							Name <ArrowUpDownIcon class="size-3.5 opacity-50" />
						</button>
					</Table.Head>
					<Table.Head>
						<button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort('vendor')}>
							Device <ArrowUpDownIcon class="size-3.5 opacity-50" />
						</button>
					</Table.Head>
					<Table.Head>Address</Table.Head>
					<Table.Head>
						<button class="inline-flex items-center gap-1 hover:text-foreground" onclick={() => toggleSort('type')}>
							Type <ArrowUpDownIcon class="size-3.5 opacity-50" />
						</button>
					</Table.Head>
					<Table.Head>Firmware</Table.Head>
					<Table.Head>Status</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if !z2m.devices.length && z2m.status !== 'unauthorized'}
					{#each { length: 6 } as _, i (i)}
						<Table.Row>
							<Table.Cell><Skeleton class="size-12 rounded-md" /></Table.Cell>
							{#each { length: 6 } as _, j (j)}
								<Table.Cell><Skeleton class="h-4 w-24" /></Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else if !rows.length}
					<Table.Row>
						<Table.Cell colspan={7} class="py-10 text-center text-muted-foreground">
							No devices match “{query}”.
						</Table.Cell>
					</Table.Row>
				{/if}

				{#each rows as d (d.ieee_address)}
					<Table.Row class={d.disabled ? 'opacity-60' : ''}>
						<Table.Cell>
							<div class="grid size-14 place-items-center rounded-md bg-white p-1 ring-1 ring-border">
								<DeviceImage device={d} httpBase={config.httpBase} class="size-full" />
							</div>
						</Table.Cell>
						<Table.Cell class="max-w-64">
							<div class="truncate font-medium">{d.friendly_name}</div>
							{#if d.description}
								<div class="truncate text-xs text-muted-foreground">{d.description}</div>
							{/if}
						</Table.Cell>
						<Table.Cell class="max-w-80">
							{#if d.definition}
								<div class="truncate">
									<span class="font-medium">{d.definition.vendor}</span>
									<span class="font-mono text-xs text-muted-foreground">{d.definition.model}</span>
								</div>
								<div class="truncate text-xs text-muted-foreground" title={d.definition.description}>
									{d.definition.description}
								</div>
							{:else if d.type === 'Coordinator'}
								<div class="font-medium">{z2m.info?.coordinator?.type ?? 'Coordinator'}</div>
								{#if z2m.info?.network}
									<div class="text-xs text-muted-foreground">
										Channel {z2m.info.network.channel} · PAN {hex(z2m.info.network.pan_id)}
									</div>
								{/if}
							{:else}
								<span class="text-muted-foreground">Unknown</span>
								{#if d.model_id}<span class="font-mono text-xs">{d.model_id}</span>{/if}
							{/if}
						</Table.Cell>
						<Table.Cell class="font-mono text-xs">
							<div>{d.ieee_address}</div>
							<div class="text-muted-foreground">{hex(d.network_address)}</div>
						</Table.Cell>
						<Table.Cell>
							<div>{d.type === 'EndDevice' ? 'End device' : d.type}</div>
							{#if d.power_source}
								<div class="flex items-center gap-1 text-xs text-muted-foreground">
									{#if isBattery(d)}<BatteryIcon class="size-3.5" />{:else}<PlugIcon class="size-3.5" />{/if}
									{isBattery(d) ? 'Battery' : 'Mains'}
								</div>
							{/if}
						</Table.Cell>
						<Table.Cell class="text-xs">
							<div class="font-mono">{d.software_build_id ?? '—'}</div>
							{#if d.date_code}<div class="text-muted-foreground">{d.date_code}</div>{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-wrap gap-1">
								{#if d.interview_state === 'FAILED'}
									<Badge variant="destructive">Interview failed</Badge>
								{:else if d.interviewing || d.interview_state === 'IN_PROGRESS'}
									<Badge variant="secondary">Interviewing</Badge>
								{:else if !d.supported && d.type !== 'Coordinator'}
									<Badge variant="destructive">Unsupported</Badge>
								{/if}
								{#if d.disabled}<Badge variant="outline">Disabled</Badge>{/if}
								{#if d.definition?.source === 'generated'}<Badge variant="secondary">Generated</Badge>{/if}
								{#if d.definition?.source === 'external'}<Badge variant="secondary">External</Badge>{/if}
								{#if d.definition?.supports_ota}<Badge variant="outline">OTA</Badge>{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
