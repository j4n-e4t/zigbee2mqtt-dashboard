<script lang="ts">
	import HaCard from '#lib/components/ha-card.svelte';
	import InfoRow from '#lib/components/info-row.svelte';
	import TabsToolbar from '#lib/components/tabs-toolbar.svelte';
	import TabsBottomBar from '#lib/components/tabs-bottom-bar.svelte';
	import ConnectionAlert from '#lib/components/connection-alert.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';
	import { z2m } from '#lib/z2m/store.svelte.js';
	import { hex, isLowBattery, typeLabel } from '#lib/z2m/format.js';
	import type { Device } from '#lib/z2m/types.js';

	const devices = $derived(z2m.devices.filter((d) => d.type !== 'Coordinator'));
	const offline = $derived(devices.filter((d) => !d.disabled && z2m.availability[d.friendly_name] === 'offline'));
	const lowBattery = $derived(devices.filter((d) => isLowBattery(z2m.deviceStates[d.friendly_name])));

	const overview = $derived([
		{ label: 'Devices', value: devices.length },
		{ label: 'Routers', value: devices.filter((d) => d.type === 'Router').length },
		{ label: 'End devices', value: devices.filter((d) => d.type === 'EndDevice').length },
		{ label: 'Offline', value: offline.length, tone: offline.length ? 'text-error' : '' },
		{ label: 'Low battery', value: lowBattery.length, tone: lowBattery.length ? 'text-error' : '' }
	]);

	/** Count devices by a key, largest group first */
	function countBy(list: Device[], key: (d: Device) => string) {
		const counts = new Map<string, number>();
		for (const d of list) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
		return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	}

	const stats = $derived([
		{ header: 'By type', rows: countBy(devices, typeLabel) },
		{ header: 'By power source', rows: countBy(devices, (d) => (d.power_source ? (d.power_source === 'Battery' ? 'Battery' : 'Mains') : 'Unknown')) },
		{ header: 'By manufacturer', rows: countBy(devices, (d) => d.definition?.vendor ?? 'Unknown') },
		{ header: 'By model', rows: countBy(devices, (d) => (d.definition ? `${d.definition.vendor} ${d.definition.model}` : 'Unknown')) }
	]);

	const info = $derived(z2m.info);
	const enabled = (v: boolean | { enabled?: boolean } | undefined) =>
		v === undefined ? undefined : (typeof v === 'boolean' ? v : !!v.enabled) ? 'Enabled' : 'Disabled';
	const extPan = (v: string | number[] | undefined) =>
		Array.isArray(v) ? '0x' + v.map((b) => b.toString(16).padStart(2, '0')).join('') : v;
	const permitJoin = $derived(
		info?.permit_join
			? info.permit_join_end
				? `Open until ${new Date(info.permit_join_end).toLocaleTimeString()}`
				: 'Open'
			: 'Closed'
	);
</script>

<div class="flex h-full flex-col">
	<TabsToolbar />
	<ConnectionAlert />

	<div class="min-h-0 flex-1 overflow-auto">
		<!-- HA config page container: max 1280px, 16px gutter, 32px top margin (none when narrow) -->
		<div class="mx-auto max-w-[1280px] px-4 py-2 {ha.narrow ? 'mt-0' : 'my-8'}">
			<HaCard header="Overview" class="mb-4">
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
					{#each overview as item (item.label)}
						<div>
							<div class="text-[length:var(--ha-font-size-3xl,28px)] leading-[var(--ha-line-height-condensed)] {item.tone ?? ''}">
								{item.value}
							</div>
							<div class="mt-1 text-muted-foreground">{item.label}</div>
						</div>
					{/each}
				</div>
			</HaCard>

			<div class="gap-4 md:columns-2 xl:columns-3 [&>*]:mb-4 [&>*]:break-inside-avoid">
				<HaCard header="Zigbee2MQTT">
					<InfoRow label="Version" value={info?.version} />
					<InfoRow label="Commit" value={info?.commit} mono />
					<InfoRow label="zigbee-herdsman" value={info?.zigbee_herdsman?.version} />
					<InfoRow label="zigbee-herdsman-converters" value={info?.zigbee_herdsman_converters?.version} />
					<InfoRow label="Log level" value={info?.log_level} />
					<InfoRow label="Permit join" value={info ? permitJoin : undefined} />
					<InfoRow label="Restart required" value={info ? (info.restart_required ? 'Yes' : 'No') : undefined} />
				</HaCard>

				<HaCard header="Coordinator">
					<InfoRow label="Type" value={info?.coordinator?.type} />
					<InfoRow label="IEEE address" value={info?.coordinator?.ieee_address} mono />
					<InfoRow label="Firmware revision" value={info?.coordinator?.meta?.revision as string | number | undefined} mono />
					<InfoRow label="Adapter" value={info?.config?.serial?.adapter} />
					<InfoRow label="Serial port" value={info?.config?.serial?.port} />
				</HaCard>

				<HaCard header="Network">
					<InfoRow label="Channel" value={info?.network?.channel} />
					<InfoRow label="PAN ID" value={info?.network ? `${hex(info.network.pan_id)} (${info.network.pan_id})` : undefined} mono />
					<InfoRow label="Extended PAN ID" value={extPan(info?.network?.extended_pan_id)} mono />
				</HaCard>

				<HaCard header="MQTT & integrations">
					<InfoRow label="MQTT server" value={info?.config?.mqtt?.server} />
					<InfoRow label="Base topic" value={info?.config?.mqtt?.base_topic} />
					<InfoRow label="Home Assistant integration" value={enabled(info?.config?.homeassistant)} />
					<InfoRow label="Availability tracking" value={enabled(info?.config?.availability)} />
					<InfoRow label="Last seen format" value={info?.config?.advanced?.last_seen} />
				</HaCard>

				{#each stats as group (group.header)}
					<HaCard header={group.header}>
						{#each group.rows as [label, count] (label)}
							<InfoRow {label} value={count} mono />
						{:else}
							<div class="text-muted-foreground">No devices</div>
						{/each}
					</HaCard>
				{/each}
			</div>
		</div>
	</div>

	{#if ha.narrow}<TabsBottomBar />{/if}
</div>
