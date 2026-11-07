<script lang="ts">
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLThAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLThAttributes> = $props();
</script>

<th bind:this={ref} data-slot="table-head" class={cn("h-14 px-[var(--cell-px)] text-left align-middle text-[length:var(--ha-font-size-s)] leading-[var(--ha-line-height-normal)] font-medium tracking-[0.0071428571em] whitespace-nowrap text-foreground shadow-[inset_0_-1px_0_var(--divider-color)]", className)} {...restProps}>
	{@render children?.()}
</th>
