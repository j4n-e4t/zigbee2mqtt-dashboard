<script lang="ts">
	import { cn, type WithElementRef } from "#lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	class={cn("h-[var(--data-table-row-height,52px)] data-[clickable]:cursor-pointer data-[clickable]:hover:bg-hover data-[state=selected]:bg-[rgba(var(--rgb-primary-color),0.04)]", className)}
	{...restProps}
>
	{@render children?.()}
</tr>
