<script lang="ts">
	import { mdiBookOpenVariant, mdiCheckCircleOutline, mdiClockOutline, mdiCloseCircleOutline, mdiMinusCircleOutline, mdiOpenInNew } from '@mdi/js';
	import { page } from '$app/state';
	import DeviceImage from '#lib/components/device-image.svelte';
	import EntityRow from '#lib/components/entity-row.svelte';
	import HaCard from '#lib/components/ha-card.svelte';
	import HaIcon from '#lib/components/ha-icon.svelte';
	import InfoRow from '#lib/components/info-row.svelte';
	import StatusLabels from '#lib/components/status-labels.svelte';
	import SubpageToolbar from '#lib/components/subpage-toolbar.svelte';
	import ConnectionAlert from '#lib/components/connection-alert.svelte';
	import { ha } from '#lib/home-assistant.svelte.js';
	import { clock, config, z2m } from '#lib/z2m/store.svelte.js';
	import { exposeEntries, type ExposeCategory } from '#lib/z2m/exposes.js';
	import {
		WEAK_LQI,
		batteryIcon,
		batteryLevel,
		deviceDocsUrl,
		formatDateTime,
		hex,
		isLowBattery,
		lastSeen,
		linkQuality,
		lqiIcon,
		relativeTime,
		typeLabel
	} from '#lib/z2m/format.js';

	const device = $derived(z2m.devices.find((d) => d.ieee_address === page.params.ieee));
	const state = $derived(device ? z2m.deviceStates[device.friendly_name] : undefined);
	const availability = $derived(device ? z2m.availability[device.friendly_name] : undefined);
	const entries = $derived(device ? exposeEntries(device, state) : []);
	const byCategory = (c: ExposeCategory) => entries.filter((e) => e.category === c);

	const seen = $derived(lastSeen(state));
	const lqi = $derived(linkQuality(state));
	const level = $derived(batteryLevel(state));
	const lowBattery = $derived(isLowBattery(state));

	const support = $derived(
		!device?.definition
			? 'No definition'
			: device.definition.source === 'generated'
				? 'Generated (not officially supported)'
				: device.definition.source === 'external'
					? 'External converter'
					: 'Supported natively'
	);
	const interview = $derived(
		device?.interview_state
			? { PENDING: 'Pending', IN_PROGRESS: 'In progress', SUCCESSFUL: 'Successful', FAILED: 'Failed' }[device.interview_state]
			: device?.interview_completed
				? 'Successful'
				: undefined
	);
	const rawState = $derived(state ? JSON.stringify(state, null, 2) : '');
</script>

{#snippet entityCard(category: ExposeCategory, header: string)}
	{@const list = byCategory(category)}
	{#if list.length}
		<HaCard {header}>
			<div class="flex flex-col gap-2">
				{#each list as e (e.key)}
					<EntityRow icon={e.icon} name={e.label} value={e.display} />
				{/each}
			</div>
		</HaCard>
	{/if}
{/snippet}

<div class="flex h-full flex-col">
	<SubpageToolbar title={device?.friendly_name ?? 'Device'} />
	<ConnectionAlert />

	<div class="min-h-0 flex-1 overflow-auto">
		<div class="mx-auto max-w-[1280px] px-4 py-2 {ha.narrow ? 'mt-0' : 'my-8'}">
			{#if !device}
				<HaCard>
					<p class="m-0 text-muted-foreground">
						{#if z2m.devices.length}
							No device with IEEE address <code>{page.params.ieee}</code>. <a href="#/" class="text-primary">Back to devices</a>
						{:else}
							Loading…
						{/if}
					</p>
				</HaCard>
			{:else}
				<!-- ha-config-device-page: three columns of cards, one when narrow -->
				<div class="grid items-start gap-4 {ha.narrow ? 'grid-cols-1' : 'lg:grid-cols-2 xl:grid-cols-3'}">
					<div class="flex min-w-0 flex-col gap-4">
						<HaCard header="Device info">
							<div class="flex gap-4">
								<div class="grid size-24 shrink-0 place-items-center">
									<DeviceImage {device} httpBase={config.httpBase} class="max-h-24 max-w-24" />
								</div>
								<div class="min-w-0">
									{#if device.definition}
										<div class="break-words">{device.definition.description}</div>
										<div class="mt-1 break-words text-muted-foreground">
											{device.definition.model} by {device.definition.vendor}
										</div>
									{:else if device.type === 'Coordinator'}
										<div>{z2m.info?.coordinator?.type ?? 'Coordinator'}</div>
									{:else}
										<div class="text-muted-foreground">Unknown device{device.model_id ? ` (${device.model_id})` : ''}</div>
									{/if}
									{#if device.description}<div class="mt-2 break-words">{device.description}</div>{/if}
									<div class="mt-2"><StatusLabels {device} /></div>
								</div>
							</div>
							<div class="mt-3">
								<InfoRow label="IEEE address" value={device.ieee_address} mono />
								<InfoRow label="Network address" value={`${hex(device.network_address)} (${device.network_address})`} mono />
								<InfoRow label="Type" value={typeLabel(device)} />
								<InfoRow label="Power source" value={device.power_source} />
								<InfoRow label="Firmware" value={device.software_build_id} mono />
								<InfoRow label="Firmware date" value={device.date_code} mono />
								<InfoRow label="Zigbee model" value={device.model_id} />
								<InfoRow label="Zigbee manufacturer" value={device.manufacturer} />
								<InfoRow label="Support" value={support} />
								<InfoRow label="Interview" value={interview} />
								<InfoRow label="OTA updates" value={device.definition ? (device.definition.supports_ota ? 'Supported' : 'Not supported') : undefined} />
							</div>
							{#snippet actions()}
								{#if device.definition}
									<!-- ha-button (text, primary) -->
									<a
										href={deviceDocsUrl(device.definition.model)}
										target="_blank"
										rel="noreferrer"
										class="inline-flex h-9 items-center gap-2 rounded-full px-3 font-medium text-primary no-underline hover:bg-[color-mix(in_srgb,var(--primary-color)_8%,transparent)]"
									>
										<HaIcon path={mdiBookOpenVariant} size={18} />
										Documentation
										<HaIcon path={mdiOpenInNew} size={14} />
									</a>
								{/if}
							{/snippet}
						</HaCard>

						{#if device.type !== 'Coordinator'}
							<HaCard header="Connectivity">
								<div class="flex flex-col gap-2">
									<EntityRow
										icon={lqiIcon(lqi)}
										name="Link quality"
										value={lqi === undefined ? '—' : `${lqi} / 255`}
										iconClass={lqi !== undefined && lqi < WEAK_LQI ? 'text-warning' : ''}
									/>
									{#if level !== undefined}
										<EntityRow icon={batteryIcon(level)} name="Battery" value="{level} %{lowBattery ? ' (low)' : ''}" iconClass={lowBattery ? 'text-error' : ''} />
									{/if}
									<EntityRow
										icon={availability === 'online' ? mdiCheckCircleOutline : availability === 'offline' ? mdiCloseCircleOutline : mdiMinusCircleOutline}
										name="Availability"
										value={device.disabled ? 'Disabled' : availability === 'online' ? 'Online' : availability === 'offline' ? 'Offline' : '—'}
										iconClass={availability === 'offline' ? 'text-error' : ''}
									/>
									<EntityRow
										icon={mdiClockOutline}
										name="Last seen"
										value={seen ? relativeTime(seen, clock.now) : '—'}
										valueTitle={seen ? formatDateTime(seen) : undefined}
									/>
								</div>
							</HaCard>
						{/if}
					</div>

					<div class="flex min-w-0 flex-col gap-4">
						{@render entityCard('controls', 'Controls')}
						{@render entityCard('sensors', 'Sensors')}
						{#if !entries.length && device.type !== 'Coordinator'}
							<HaCard header="Entities">
								<p class="m-0 text-muted-foreground">This device doesn't expose any values.</p>
							</HaCard>
						{/if}
					</div>

					<div class="flex min-w-0 flex-col gap-4">
						{@render entityCard('config', 'Configuration')}
						{@render entityCard('diagnostic', 'Diagnostic')}
						{#if device.type !== 'Coordinator'}
							<HaCard header="Raw state">
								{#if rawState}
									<pre
										class="m-0 max-h-96 overflow-auto rounded-[var(--ha-border-radius-md)] bg-[var(--ha-color-fill-neutral-quiet-resting)] p-3 font-mono text-[length:var(--ha-font-size-s)] leading-normal">{rawState}</pre>
								{:else}
									<p class="m-0 text-muted-foreground">No state received yet.</p>
								{/if}
							</HaCard>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
