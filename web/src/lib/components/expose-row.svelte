<script lang="ts">
	import { mdiPencil, mdiRefresh } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';
	import HaDialog from './ha-dialog.svelte';
	import type { ExposeEntry } from '#lib/z2m/exposes.js';
	import type { Expose } from '#lib/z2m/types.js';
	import { z2m } from '#lib/z2m/store.svelte.js';
	import { errorMessage, toast } from '#lib/ui.svelte.js';

	// One hui-generic-entity-row per exposed property, with a control for writable ones.
	// Writes go to `<entity>/set` as { [property]: value }; refresh sends `<entity>/get` { [property]: "" }.
	let { entry, entity, disabled = false }: { entry: ExposeEntry; entity: string; disabled?: boolean } = $props();

	const e = $derived(entry.expose);

	function set(value: unknown) {
		try {
			z2m.send(`${entity}/set`, { [entry.property]: value });
		} catch (error) {
			toast(errorMessage(error), { error: true });
		}
	}
	function refresh() {
		try {
			z2m.send(`${entity}/get`, { [entry.property]: '' });
		} catch (error) {
			toast(errorMessage(error), { error: true });
		}
	}

	// numeric: slider when the range is known and small enough, otherwise a number field
	let draft = $state<number | null>(null);
	const numberValue = $derived(typeof entry.value === 'number' ? entry.value : undefined);
	const useSlider = $derived(
		e.type === 'numeric' && e.value_min !== undefined && e.value_max !== undefined && e.value_max - e.value_min <= 1000
	);

	// composite / list: edit in a dialog
	let editOpen = $state(false);
	let editFields = $state<Record<string, string>>({});
	let editJson = $state('');
	const subFields = $derived(
		e.type === 'composite' ? (e.features as Expose[]).filter((f) => f.property || f.name) : []
	);
	function openEditor() {
		const current = (entry.value ?? {}) as Record<string, unknown>;
		if (e.type === 'composite') {
			editFields = Object.fromEntries(
				subFields.map((f) => {
					const key = (f.property ?? f.name)!;
					return [key, current[key] === undefined ? '' : String(current[key])];
				})
			);
		} else {
			editJson = JSON.stringify(entry.value ?? [], null, 2);
		}
		editOpen = true;
	}
	function applyEditor() {
		if (e.type === 'composite') {
			const out: Record<string, unknown> = {};
			for (const f of subFields) {
				const key = (f.property ?? f.name)!;
				const raw = editFields[key];
				if (raw === '' || raw === undefined) continue;
				out[key] = f.type === 'numeric' ? Number(raw) : f.type === 'binary' ? raw === 'true' : raw;
			}
			set(out);
		} else {
			try {
				set(JSON.parse(editJson));
			} catch {
				toast('Invalid JSON', { error: true });
				return;
			}
		}
		editOpen = false;
	}

	// color composites: native color input, sent as { hex }
	const isColor = $derived(e.type === 'composite' && (e.name?.startsWith('color') || entry.property === 'color'));
	function xyToHex(v: unknown) {
		const c = v as { x?: number; y?: number; hex?: string } | undefined;
		if (c?.hex) return c.hex;
		if (typeof c?.x !== 'number' || typeof c?.y !== 'number' || c.y === 0) return '#ffffff';
		const Y = 1;
		const X = (Y / c.y) * c.x;
		const Z = (Y / c.y) * (1 - c.x - c.y);
		let rgb = [X * 1.656492 - Y * 0.354851 - Z * 0.255038, -X * 0.707196 + Y * 1.655397 + Z * 0.036152, X * 0.051713 - Y * 0.121364 + Z * 1.01153];
		const max = Math.max(...rgb, 1);
		rgb = rgb.map((v) => Math.max(0, v / max)).map((v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
		return '#' + rgb.map((v) => Math.round(Math.min(1, v) * 255).toString(16).padStart(2, '0')).join('');
	}
</script>

<div class="flex min-h-10 items-center">
	<div class="grid size-10 shrink-0 place-items-center rounded-full text-[var(--state-icon-color)]">
		<HaIcon path={entry.icon} />
	</div>
	<div class="min-w-0 flex-[1_1_30%] truncate ps-4 pe-2" title={e.description}>
		<div class="truncate">{entry.label}</div>
	</div>

	<div class="ms-2 flex max-w-[65%] min-w-0 items-center justify-end gap-2">
		{#if !entry.writable}
			<span class="truncate text-end" dir="ltr" title={entry.display}>{entry.display}</span>
		{:else if e.type === 'binary'}
			{#if entry.published}<span class="text-muted-foreground">{entry.display}</span>{/if}
			<input
				type="checkbox"
				class="ha-switch"
				aria-label={entry.label}
				{disabled}
				checked={entry.value === e.value_on}
				onchange={(ev) => set(ev.currentTarget.checked ? e.value_on : e.value_off)}
			/>
		{:else if e.type === 'numeric'}
			{#if useSlider}
				<input
					type="range"
					class="ha-slider w-28 sm:w-40"
					aria-label={entry.label}
					{disabled}
					min={e.value_min}
					max={e.value_max}
					step={(e as { value_step?: number }).value_step ?? 1}
					value={draft ?? numberValue ?? e.value_min}
					oninput={(ev) => (draft = Number(ev.currentTarget.value))}
					onchange={(ev) => {
						set(Number(ev.currentTarget.value));
						draft = null;
					}}
				/>
				<span class="w-16 shrink-0 text-end tabular-nums" dir="ltr">{draft ?? numberValue ?? '—'}{e.unit && e.unit !== 'lqi' ? ` ${e.unit}` : ''}</span>
			{:else}
				<input
					type="number"
					class="ha-input h-9! w-28"
					aria-label={entry.label}
					{disabled}
					min={e.value_min}
					max={e.value_max}
					step={(e as { value_step?: number }).value_step ?? 'any'}
					value={numberValue ?? ''}
					onchange={(ev) => ev.currentTarget.value !== '' && set(Number(ev.currentTarget.value))}
				/>
				{#if e.unit}<span class="text-muted-foreground">{e.unit}</span>{/if}
			{/if}
		{:else if e.type === 'enum'}
			<select
				class="ha-input h-9! w-auto max-w-48"
				aria-label={entry.label}
				{disabled}
				value={entry.published && typeof entry.value === 'string' ? entry.value : ''}
				onchange={(ev) => ev.currentTarget.value && set(ev.currentTarget.value)}
			>
				{#if !entry.published || entry.value === undefined}<option value="" disabled>Choose…</option>{/if}
				{#each e.values as v (v)}<option value={v}>{v.replace(/_/g, ' ')}</option>{/each}
			</select>
		{:else if e.type === 'text'}
			<input
				type="text"
				class="ha-input h-9! w-44"
				aria-label={entry.label}
				{disabled}
				value={typeof entry.value === 'string' ? entry.value : ''}
				onkeydown={(ev) => ev.key === 'Enter' && set(ev.currentTarget.value)}
				onchange={(ev) => set(ev.currentTarget.value)}
			/>
		{:else if isColor}
			<span class="truncate text-muted-foreground" dir="ltr">{entry.display}</span>
			<input
				type="color"
				class="h-9 w-12 cursor-pointer rounded-md border border-[var(--ha-color-border-neutral-quiet)] bg-card p-1"
				aria-label={entry.label}
				{disabled}
				value={xyToHex(entry.value)}
				onchange={(ev) => set({ hex: ev.currentTarget.value })}
			/>
		{:else}
			<span class="truncate text-end text-muted-foreground" dir="ltr">{entry.display}</span>
			<button type="button" class="ha-icon-button size-9!" aria-label="Edit {entry.label}" title="Edit" {disabled} onclick={openEditor}>
				<HaIcon path={mdiPencil} size={20} />
			</button>
		{/if}

		{#if entry.gettable}
			<button type="button" class="ha-icon-button size-9!" aria-label="Refresh {entry.label}" title="Refresh" {disabled} onclick={refresh}>
				<HaIcon path={mdiRefresh} size={20} />
			</button>
		{/if}
	</div>
</div>

<HaDialog bind:open={editOpen} title={entry.label}>
	{#if e.type === 'composite'}
		<div class="flex flex-col gap-4">
			{#each subFields as f ((f.property ?? f.name)!)}
				{@const key = (f.property ?? f.name)!}
				<label>
					<span class="ha-field-label">{f.label ?? key}{f.type === 'numeric' && f.unit ? ` (${f.unit})` : ''}</span>
					{#if f.type === 'enum'}
						<select class="ha-input" bind:value={editFields[key]}>
							<option value="">—</option>
							{#each f.values as v (v)}<option value={v}>{v}</option>{/each}
						</select>
					{:else if f.type === 'binary'}
						<select class="ha-input" bind:value={editFields[key]}>
							<option value="">—</option>
							<option value="true">true</option>
							<option value="false">false</option>
						</select>
					{:else}
						<input class="ha-input" type={f.type === 'numeric' ? 'number' : 'text'} step="any" bind:value={editFields[key]} />
					{/if}
				</label>
			{/each}
		</div>
	{:else}
		<label>
			<span class="ha-field-label">Value (JSON)</span>
			<textarea class="ha-input font-mono" rows="8" bind:value={editJson}></textarea>
		</label>
	{/if}
	{#snippet footer()}
		<button type="button" class="ha-button" data-appearance="plain" onclick={() => (editOpen = false)}>Cancel</button>
		<button type="button" class="ha-button" onclick={applyEditor}>Apply</button>
	{/snippet}
</HaDialog>
