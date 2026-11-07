<script lang="ts">
	import { mdiArrowDown, mdiArrowUp } from '@mdi/js';
	import { TableHead } from '#lib/components/ui/table/index.js';
	import HaIcon from '#lib/components/ha-icon.svelte';

	// ha-data-table's sortable header: the arrow is hidden off to the left until the column is sorted
	// (or hovered/focused); then it slides in at 12px and the title shifts right by 24px.
	let {
		title,
		sorted,
		direction,
		onsort,
		class: className = ''
	}: {
		title: string;
		sorted: boolean;
		direction: 'asc' | 'desc';
		onsort: () => void;
		class?: string;
	} = $props();
</script>

<TableHead
	class="group relative overflow-hidden {className}"
	aria-sort={sorted ? (direction === 'desc' ? 'descending' : 'ascending') : undefined}
>
	<button
		type="button"
		class="-mx-2 block w-[calc(100%+16px)] cursor-pointer truncate rounded-sm px-2 py-1 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
		onclick={onsort}
	>
		<span
			class="absolute top-1/2 -translate-y-1/2 transition-[left] duration-200 ease-in-out {sorted
				? 'left-[calc(var(--cell-px)-4px)]'
				: '-left-5 group-focus-within:left-[calc(var(--cell-px)-4px)] group-hover:left-[calc(var(--cell-px)-4px)]'}"
		>
			<HaIcon path={sorted && direction === 'desc' ? mdiArrowDown : mdiArrowUp} />
		</span>
		<span
			class="relative transition-[left] duration-200 ease-in-out {sorted
				? 'left-6'
				: 'left-0 group-focus-within:left-6 group-hover:left-6'}">{title}</span
		>
	</button>
</TableHead>
