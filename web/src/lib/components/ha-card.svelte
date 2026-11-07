<script lang="ts">
	import type { Snippet } from 'svelte';

	// ha-card: card background, 1px divider border, 12px radius, no shadow.
	// Header: 24px regular, 20px 16px 24px padding; content follows with 16px padding.
	let {
		header,
		headerEnd,
		children,
		actions,
		class: className = ''
	}: { header?: string; headerEnd?: Snippet; children: Snippet; actions?: Snippet; class?: string } = $props();
</script>

<section
	class="relative block rounded-[var(--ha-border-radius-lg)] border border-[var(--divider-color)] bg-card text-foreground {className}"
>
	{#if header}
		<div class="flex items-center justify-between gap-2 px-4 pt-5 pb-3">
			<h2
				class="m-0 min-w-0 truncate text-[length:var(--ha-font-size-2xl)] leading-[var(--ha-line-height-condensed)] font-normal tracking-[-0.012em]"
			>
				{header}
			</h2>
			{@render headerEnd?.()}
		</div>
	{/if}
	<div class="p-4 {header ? 'pt-0' : ''}">
		{@render children()}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-2 border-t border-[var(--divider-color)] p-2">
			{@render actions()}
		</div>
	{/if}
</section>
