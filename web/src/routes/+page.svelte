<script lang="ts">
	import { mdiHelpCircleOutline } from '@mdi/js';
	import * as Table from '#lib/components/ui/table/index.js';
	import TableToolbar from '#lib/components/table-toolbar.svelte';
	import DeviceImage from '#lib/components/device-image.svelte';
	import HaIcon from '#lib/components/ha-icon.svelte';
	import SortHeader from '#lib/components/sort-header.svelte';
	import PageShell from '#lib/components/page-shell.svelte';
	import ColumnPicker from '#lib/components/column-picker.svelte';
	import StatusLabels from '#lib/components/status-labels.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';
	import { prefs, sortBy, isVisible, type ColumnId, type SortKey } from '#lib/prefs.svelte.js';
	import { clock, config, z2m } from '#lib/z2m/store.svelte.js';
	import {
		WEAK_LQI,
		batteryIcon,
		batteryLevel,
		formatDateTime,
		hex,
		isLowBattery,
		lastSeen,
		linkQuality,
		lqiIcon,
		relativeTime,
		typeLabel
	} from '#lib/z2m/format.js';
	import type { Device } from '#lib/z2m/types.js';

	let query = $state('');

	// On phones only the essentials fit; the user's own column choices still apply on top.
	const NARROW_HIDDEN: ColumnId[] = ['manufacturer', 'model', 'ieee', 'type', 'availability', 'firmware', 'status'];
	const show = (id: ColumnId) => isVisible(id) && !(ha.narrow && NARROW_HIDDEN.includes(id));

	const stateOf = (d: Device) => z2m.deviceStates[d.friendly_name];
	const availabilityRank = (d: Device) =>
		d.disabled ? 2 : z2m.availability[d.friendly_name] === 'online' ? 0 : z2m.availability[d.friendly_name] === 'offline' ? 1 : 3;

	// string keys compare as text, numbers numerically; missing values always sort last
	const sortValue: Record<SortKey, (d: Device) => string | number | undefined> = {
		name: (d) => d.friendly_name,
		manufacturer: (d) => d.definition?.vendor,
		model: (d) => d.definition?.model,
		ieee: (d) => d.ieee_address,
		type: (d) => typeLabel(d),
		lqi: (d) => linkQuality(stateOf(d)),
		battery: (d) => batteryLevel(stateOf(d)),
		lastSeen: (d) => lastSeen(stateOf(d))?.getTime(),
		availability: availabilityRank
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
		const dir = prefs.sortDir === 'asc' ? 1 : -1;
		const value = sortValue[prefs.sortKey] ?? sortValue.name;
		return [...filtered].sort((a, b) => {
			const va = value(a);
			const vb = value(b);
			if (va === undefined || vb === undefined) return va === vb ? 0 : va === undefined ? 1 : -1;
			if (typeof va === 'number' && typeof vb === 'number') return dir * (va - vb);
			return dir * String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' });
		});
	});

	const open = (d: Device) => (location.hash = `/device/${d.ieee_address}`);
</script>

{#snippet sortable(title: string, key: SortKey)}
	<SortHeader {title} sorted={prefs.sortKey === key} direction={prefs.sortDir} onsort={() => sortBy(key)} />
{/snippet}

<PageShell>
 <h1 class="m-0 mb-4 text-2xl font-normal">Devices</h1>

 <TableToolbar bind:query label="Search devices" placeholder={`Search ${z2m.devices.length} devices`}><ColumnPicker /></TableToolbar>

	<div class="overflow-auto rounded-lg border border-[var(--divider-color)] bg-card">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[72px]"><span class="sr-only">Image</span></Table.Head>
					{@render sortable('Name', 'name')}
					{#if show('manufacturer')}{@render sortable('Manufacturer', 'manufacturer')}{/if}
					{#if show('model')}{@render sortable('Model', 'model')}{/if}
					{#if show('ieee')}{@render sortable('IEEE address', 'ieee')}{/if}
					{#if show('type')}{@render sortable('Type', 'type')}{/if}
					{#if show('lqi')}{@render sortable('LQI', 'lqi')}{/if}
					{#if show('battery')}{@render sortable('Battery', 'battery')}{/if}
					{#if show('lastSeen')}{@render sortable('Last seen', 'lastSeen')}{/if}
					{#if show('availability')}{@render sortable('Availability', 'availability')}{/if}
					{#if show('firmware')}<Table.Head>Firmware</Table.Head>{/if}
					{#if show('status')}<Table.Head>Status</Table.Head>{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each rows as d (d.ieee_address)}
					{@const state = stateOf(d)}
					{@const lqi = linkQuality(state)}
					{@const level = batteryLevel(state)}
					{@const seen = lastSeen(state)}
					{@const avail = z2m.availability[d.friendly_name]}
					<Table.Row data-clickable onclick={() => open(d)}>
						<Table.Cell class="w-[72px]">
							<div class="grid size-10 place-items-center">
								<DeviceImage device={d} httpBase={config.httpBase} class="max-h-10 max-w-10" />
							</div>
						</Table.Cell>
						<Table.Cell class="max-w-72">
							<a
								href="#/device/{d.ieee_address}"
								class="block truncate text-inherit no-underline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
								onclick={(e) => e.stopPropagation()}>{d.friendly_name}</a
							>
							{#if d.description}
								<div class="mt-0.5 truncate text-muted-foreground">{d.description}</div>
							{/if}
						</Table.Cell>
						{#if show('manufacturer')}
							<Table.Cell class="max-w-48 truncate">
								{d.definition?.vendor ?? (d.type === 'Coordinator' ? '—' : (d.manufacturer ?? '—'))}
							</Table.Cell>
						{/if}
						{#if show('model')}
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
						{/if}
						{#if show('ieee')}
							<Table.Cell class="tabular-nums" dir="ltr">
								<div>{d.ieee_address}</div>
								<div class="mt-0.5 text-muted-foreground">{hex(d.network_address)}</div>
							</Table.Cell>
						{/if}
						{#if show('type')}
							<Table.Cell>
								<div>{typeLabel(d)}</div>
								{#if d.power_source}
									<div class="mt-0.5 text-muted-foreground">
										{d.power_source === 'Battery' ? 'Battery' : 'Mains'}
									</div>
								{/if}
							</Table.Cell>
						{/if}
						{#if show('lqi')}
							<Table.Cell class="tabular-nums">
								{#if lqi !== undefined}
									<span class="flex items-center gap-1 {lqi < WEAK_LQI ? 'text-warning' : ''}" title="Link quality {lqi} / 255">
										<HaIcon path={lqiIcon(lqi)} size={18} class={lqi < WEAK_LQI ? '' : 'text-muted-foreground'} />
										{lqi}
									</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						{/if}
						{#if show('battery')}
							<Table.Cell class="tabular-nums">
								{#if level !== undefined}
									{@const low = isLowBattery(state)}
									<span class="flex items-center gap-1 {low ? 'text-error' : ''}" title={low ? 'Low battery' : undefined}>
										<HaIcon path={batteryIcon(level)} size={18} class={low ? '' : 'text-muted-foreground'} />
										{level} %
									</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						{/if}
						{#if show('lastSeen')}
							<Table.Cell>
								{#if seen}
									<span title={formatDateTime(seen)}>{relativeTime(seen, clock.now)}</span>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						{/if}
						{#if show('availability')}
							<Table.Cell>
								{#if d.disabled}
									<span class="ha-label" data-tone="neutral">Disabled</span>
								{:else if avail === 'offline'}
									<span class="ha-label" data-tone="danger">Offline</span>
								{:else if avail === 'online'}
									Online
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</Table.Cell>
						{/if}
						{#if show('firmware')}
							<Table.Cell>
								<div>{d.software_build_id ?? '—'}</div>
								{#if d.date_code}<div class="mt-0.5 text-muted-foreground">{d.date_code}</div>{/if}
							</Table.Cell>
						{/if}
						{#if show('status')}
							<Table.Cell>
								<StatusLabels device={d} />
							</Table.Cell>
						{/if}
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

</PageShell>
