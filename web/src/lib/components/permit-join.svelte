<script lang="ts">
	import { mdiChevronDown, mdiAccessPointNetwork, mdiAccessPointNetworkOff } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';
	import { clock, z2m } from '#lib/z2m/store.svelte.js';
	import { run } from '#lib/ui.svelte.js';

	// Permit join: bridge/request/permit_join { time, device? }; time 0 closes. State comes back in bridge/info.
	let open = $state(false);
	let time = $state(254);
	let target = $state(''); // '' = all devices (coordinator + routers)
	let root: HTMLDivElement;

	const active = $derived(!!z2m.info?.permit_join);
	const remaining = $derived(
		active && z2m.info?.permit_join_end ? Math.max(0, Math.round((z2m.info.permit_join_end - clock.now) / 1000)) : undefined
	);
	const routers = $derived(z2m.devices.filter((d) => d.type === 'Router' && !d.disabled));

	// tick every second while open, so the countdown moves
	$effect(() => {
		if (!active) return;
		const id = setInterval(() => (clock.now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	async function toggle() {
		if (active) {
			await run(() => z2m.request('permit_join', { time: 0 }), 'Joining disabled');
		} else {
			await run(
				() => z2m.request('permit_join', { time, ...(target ? { device: target } : {}) }),
				`Joining enabled for ${time} s${target ? ` via ${target}` : ''}`
			);
		}
		open = false;
	}
</script>

<svelte:window onclick={(e) => open && !root.contains(e.target as Node) && (open = false)} />

<div class="relative flex items-center" bind:this={root}>
	<button
		type="button"
		class="ha-button"
		data-size="s"
		data-appearance={active ? undefined : 'outlined'}
		title={active ? 'Stop joining' : 'Allow new devices to join'}
		onclick={toggle}
	>
		<HaIcon path={active ? mdiAccessPointNetwork : mdiAccessPointNetworkOff} size={18} />
		<span class="max-[600px]:hidden">{active ? `Joining${remaining !== undefined ? ` · ${remaining}s` : ''}` : 'Permit join'}</span>
	</button>
	{#if !active}
		<button type="button" class="ha-icon-button size-8!" aria-label="Permit join options" aria-expanded={open} onclick={() => (open = !open)}>
			<HaIcon path={mdiChevronDown} size={20} />
		</button>
	{/if}
	{#if open}
		<div class="absolute top-full right-0 z-30 mt-1 w-72 rounded-[var(--ha-border-radius-lg)] border border-[var(--divider-color)] bg-card p-4 text-[length:var(--ha-font-size-m)] shadow-[var(--ha-shadow-l)]">
			<label class="block">
				<span class="ha-field-label">Join via</span>
				<select class="ha-input" bind:value={target}>
					<option value="">All (coordinator and routers)</option>
					{#each routers as r (r.ieee_address)}<option value={r.friendly_name}>{r.friendly_name}</option>{/each}
				</select>
			</label>
			<label class="mt-3 block">
				<span class="ha-field-label">Duration: {time} s</span>
				<input type="range" class="ha-slider" min="10" max="254" bind:value={time} />
			</label>
			<div class="mt-3 flex justify-end">
				<button type="button" class="ha-button" data-size="s" onclick={toggle}>Permit join</button>
			</div>
		</div>
	{/if}
</div>
