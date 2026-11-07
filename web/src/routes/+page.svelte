<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		mdiAlertCircleOutline,
		mdiBattery,
		mdiHelpCircleOutline,
		mdiMagnify,
		mdiPowerPlug,
		mdiZigbee
	} from '@mdi/js';
	import * as Table from '#lib/components/ui/table/index.js';
	import DeviceImage from '#lib/components/device-image.svelte';
	import HaIcon from '#lib/components/ha-icon.svelte';
	import SortHeader from '#lib/components/sort-header.svelte';
	import { loadConfig } from '#lib/config.js';
	import { ha } from '#lib/home-assistant.svelte.js';
	import { Z2MClient } from '#lib/z2m/client.svelte.js';
	import type { Device } from '#lib/z2m/types.js';

	const config = loadConfig();
	const z2m = new Z2MClient(config);
	z2m.connect();
	onDestroy(() => z2m.disconnect());

	let query = $state('');
	type SortKey = 'name' | 'manufacturer' | 'model' | 'ieee' | 'type';
	let sortKey = $state<SortKey>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	const typeLabel = (d: Device) => (d.type === 'EndDevice' ? 'End device' : d.type);
	const sortValue: Record<SortKey, (d: Device) => string> = {
		name: (d) => d.friendly_name,
		manufacturer: (d) => d.definition?.vendor ?? '￿',
		model: (d) => d.definition?.model ?? '￿',
		ieee: (d) => d.ieee_address,
		type: (d) => typeLabel(d)
	};

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
		const dir = sortDir === 'asc' ? 1 : -1;
		const value = sortValue[sortKey];
		return [...filtered].sort(
			(a, b) => dir * value(a).localeCompare(value(b), undefined, { numeric: true, sensitivity: 'base' })
		);
	});

	// HA's sorting cycle: new column -> asc, then toggles asc/desc
	function sortBy(key: SortKey) {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	const hex = (n: number) => `0x${n.toString(16).padStart(4, '0')}`;

	const connected = $derived(z2m.status === 'open' && z2m.bridgeState !== 'offline');
	const statusText = $derived(
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

<div class="flex h-full flex-col">
	<!-- hass-subpage toolbar: 56px, 8px 12px padding, 20px regular title inset 24px (8px narrow) -->
	<header
		class="flex h-[var(--header-height)] shrink-0 items-center bg-header px-3 py-2 text-header-foreground [border-bottom:var(--app-header-border-bottom)]"
	>
		<div class="grid size-12 shrink-0 place-items-center text-icon">
			<HaIcon path={mdiZigbee} />
		</div>
		<h1
			class="m-0 min-w-0 flex-1 truncate text-[length:var(--ha-font-size-xl)] leading-[var(--ha-line-height-normal)] font-normal {ha.narrow
				? 'ms-2'
				: 'ms-6'}"
		>
			Zigbee devices
		</h1>
		<div class="flex shrink-0 items-center gap-3 pe-1 text-muted-foreground" title={config.wsUrl}>
			{#if z2m.info && !ha.narrow}
				<span>Zigbee2MQTT {z2m.info.version}</span>
			{/if}
			<span
				class="ha-label"
				data-tone={connected ? 'primary' : z2m.status === 'connecting' ? 'neutral' : 'danger'}
			>
				{statusText}
			</span>
		</div>
	</header>

	<!-- hass-tabs-subpage-data-table .table-header: 56px search bar on the page background -->
	<div class="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4">
		<label
			class="flex flex-1 items-center gap-2 border border-[var(--ha-color-border-neutral-quiet)] bg-card px-2 text-muted-foreground transition-colors hover:border-[var(--ha-color-border-neutral-normal)] focus-within:border-primary {ha.narrow
				? 'h-10 rounded-md'
				: 'h-8 rounded-[10px]'}"
		>
			<HaIcon path={mdiMagnify} size={20} />
			<input
				type="search"
				bind:value={query}
				placeholder="Search {z2m.devices.length} devices"
				aria-label="Search devices"
				class="h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-[var(--ha-color-placeholder)]"
			/>
		</label>
	</div>

	{#if z2m.lastError && z2m.status !== 'open'}
		<!-- ha-alert (error) -->
		<div
			role="alert"
			class="m-3 mb-0 flex items-start gap-3 rounded-sm bg-[color-mix(in_srgb,var(--error-color)_12%,transparent)] py-2 pr-2 pl-3 leading-normal"
		>
			<HaIcon path={mdiAlertCircleOutline} class="text-error" />
			<span class="flex-1 self-center">
				{z2m.lastError}. Check <code>Z2M_URL</code> / <code>config.js</code>.
			</span>
		</div>
	{/if}

	<div class="min-h-0 flex-1 overflow-auto bg-table">
		<Table.Root class={ha.narrow ? '[--cell-px:var(--ha-space-2)]' : ''}>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[72px]"><span class="sr-only">Image</span></Table.Head>
					<SortHeader title="Name" sorted={sortKey === 'name'} direction={sortDir} onsort={() => sortBy('name')} />
					{#if !ha.narrow}
						<SortHeader
							title="Manufacturer"
							sorted={sortKey === 'manufacturer'}
							direction={sortDir}
							onsort={() => sortBy('manufacturer')}
						/>
					{/if}
					<SortHeader title="Model" sorted={sortKey === 'model'} direction={sortDir} onsort={() => sortBy('model')} />
					{#if !ha.narrow}
						<SortHeader
							title="IEEE address"
							sorted={sortKey === 'ieee'}
							direction={sortDir}
							onsort={() => sortBy('ieee')}
						/>
						<SortHeader title="Type" sorted={sortKey === 'type'} direction={sortDir} onsort={() => sortBy('type')} />
						<Table.Head>Firmware</Table.Head>
					{/if}
					<Table.Head>Status</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as d (d.ieee_address)}
					<Table.Row>
						<Table.Cell class="w-[72px]">
							<div class="grid size-10 place-items-center">
								<DeviceImage device={d} httpBase={config.httpBase} class="max-h-10 max-w-10" />
							</div>
						</Table.Cell>
						<Table.Cell class="max-w-72">
							<div class="truncate">{d.friendly_name}</div>
							{#if d.description}
								<div class="mt-0.5 truncate text-muted-foreground">{d.description}</div>
							{/if}
						</Table.Cell>
						{#if !ha.narrow}
							<Table.Cell class="max-w-48 truncate">
								{d.definition?.vendor ?? (d.type === 'Coordinator' ? '—' : d.manufacturer ?? '—')}
							</Table.Cell>
						{/if}
						<Table.Cell class="max-w-80">
							{#if d.definition}
								<div class="truncate">{d.definition.model}</div>
								<div class="mt-0.5 truncate text-muted-foreground" title={d.definition.description}>
									{d.definition.description}
								</div>
							{:else if d.type === 'Coordinator'}
								<div class="truncate">{z2m.info?.coordinator?.type ?? 'Coordinator'}</div>
								{#if z2m.info?.network}
									<div class="mt-0.5 truncate text-muted-foreground">
										Channel {z2m.info.network.channel} · PAN {hex(z2m.info.network.pan_id)}
									</div>
								{/if}
							{:else}
								<div class="flex items-center gap-1 text-muted-foreground">
									<HaIcon path={mdiHelpCircleOutline} size={16} />Unknown
								</div>
								{#if d.model_id}<div class="mt-0.5 truncate text-muted-foreground">{d.model_id}</div>{/if}
							{/if}
						</Table.Cell>
						{#if !ha.narrow}
							<Table.Cell class="tabular-nums" dir="ltr">
								<div>{d.ieee_address}</div>
								<div class="mt-0.5 text-muted-foreground">{hex(d.network_address)}</div>
							</Table.Cell>
							<Table.Cell>
								<div>{typeLabel(d)}</div>
								{#if d.power_source}
									<div class="mt-0.5 flex items-center gap-0.5 text-muted-foreground">
										<HaIcon path={d.power_source === 'Battery' ? mdiBattery : mdiPowerPlug} size={16} />
										{d.power_source === 'Battery' ? 'Battery' : 'Mains'}
									</div>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div>{d.software_build_id ?? '—'}</div>
								{#if d.date_code}<div class="mt-0.5 text-muted-foreground">{d.date_code}</div>{/if}
							</Table.Cell>
						{/if}
						<Table.Cell>
							<div class="flex gap-1">
								{#if d.interview_state === 'FAILED'}
									<span class="ha-label" data-tone="danger">Interview failed</span>
								{:else if d.interviewing || d.interview_state === 'IN_PROGRESS'}
									<span class="ha-label" data-tone="primary">Interviewing</span>
								{:else if !d.supported && d.type !== 'Coordinator'}
									<span class="ha-label" data-tone="warning">Unsupported</span>
								{/if}
								{#if d.disabled}<span class="ha-label" data-tone="neutral">Disabled</span>{/if}
								{#if d.definition?.source === 'generated'}<span class="ha-label">Generated</span>{/if}
								{#if d.definition?.source === 'external'}<span class="ha-label">External</span>{/if}
								{#if d.definition?.supports_ota}<span class="ha-label">OTA</span>{/if}
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		{#if !z2m.devices.length}
			<div class="p-4 text-center text-muted-foreground">
				{z2m.status === 'connecting' ? 'Loading devices…' : 'No devices'}
			</div>
		{:else if !rows.length}
			<div class="p-4 text-center text-muted-foreground">No devices match “{query}”</div>
		{/if}
	</div>
</div>
