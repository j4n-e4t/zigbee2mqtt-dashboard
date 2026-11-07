<script lang="ts">
	import { mdiTableCog } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';
	import { COLUMNS, isVisible, resetPrefs, setVisible } from '#lib/prefs.svelte.js';

	// Column chooser, in the spirit of HA's "Customize table" (toolbar icon button + menu surface).
	let open = $state(false);
	let root: HTMLDivElement;

	function onWindowClick(event: MouseEvent) {
		if (open && !root.contains(event.target as Node)) open = false;
	}
</script>

<svelte:window onclick={onWindowClick} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="relative" bind:this={root}>
	<button
		type="button"
		title="Customize table"
		aria-label="Customize table"
		aria-expanded={open}
		class="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-hover focus-visible:outline-2 focus-visible:outline-primary"
		onclick={() => (open = !open)}
	>
		<HaIcon path={mdiTableCog} />
	</button>
	{#if open}
		<div
			role="menu"
			class="absolute top-full right-0 z-30 mt-1 w-60 rounded-[var(--ha-border-radius-lg)] border border-[var(--divider-color)] bg-card py-2 shadow-[0_4px_16px_var(--shadow-color)]"
		>
			<div class="px-4 pt-1 pb-2 text-[length:var(--ha-font-size-s)] font-medium text-muted-foreground">
				Columns
			</div>
			{#each COLUMNS as col (col.id)}
				<label class="flex h-10 cursor-pointer items-center gap-4 px-4 hover:bg-hover">
					<input
						type="checkbox"
						class="size-[18px] accent-[var(--primary-color)]"
						checked={isVisible(col.id)}
						onchange={(e) => setVisible(col.id, e.currentTarget.checked)}
					/>
					{col.label}
				</label>
			{/each}
			<div class="mt-1 border-t border-[var(--divider-color)] px-2 pt-2">
				<button
					type="button"
					class="h-9 rounded-full px-3 font-medium text-primary hover:bg-[color-mix(in_srgb,var(--primary-color)_8%,transparent)]"
					onclick={resetPrefs}
				>
					Reset to default
				</button>
			</div>
		</div>
	{/if}
</div>
