<script lang="ts">
	import HaIcon from './ha-icon.svelte';

	// hui-generic-entity-row: 40px state badge, name (16px inset), state right-aligned.
	let {
		icon,
		name,
		secondary,
		value,
		iconClass = '',
		valueTitle
	}: { icon: string; name: string; secondary?: string; value: string; iconClass?: string; valueTitle?: string } =
		$props();
</script>

<div class="flex min-h-10 items-center">
	<div class="grid size-10 shrink-0 place-items-center rounded-full text-[var(--state-icon-color)] {iconClass}">
		<HaIcon path={icon} />
	</div>
	<div class="min-w-0 flex-[1_1_30%] truncate ps-4 pe-2">
		<div class="truncate">{name}</div>
		{#if secondary}<div class="truncate text-muted-foreground">{secondary}</div>{/if}
	</div>
	<div class="ms-2 max-w-[60%] truncate text-end" dir="ltr" title={valueTitle ?? value}>{value}</div>
</div>
