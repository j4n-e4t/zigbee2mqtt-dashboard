<script lang="ts">
	import { ha } from '#lib/home-assistant.svelte.js';
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLTableAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLTableAttributes> = $props();
</script>

<!-- ha-data-table: 14px body text, 1.2 line height; cells inset by --cell-px (16px, 8px when narrow). -->
<table
	bind:this={ref}
	data-slot="table"
	class={cn("w-full border-collapse bg-table text-[length:var(--ha-font-size-m)] leading-[var(--ha-line-height-condensed)] tracking-[0.0178571429em] text-foreground [--cell-px:var(--ha-space-4)]", ha.narrow ? '[--cell-px:var(--ha-space-2)]' : '', className)}
	{...restProps}
>
	{@render children?.()}
</table>
