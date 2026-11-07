<script lang="ts">
	import type { Snippet } from 'svelte';
	import { mdiClose } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';

	// ha-dialog: card surface, 24px radius, 24px padding, 24px regular title, large shadow;
	// widths sm 320 / md 580 / lg 1024; full screen on phones (<= 450px wide).
	let {
		open = $bindable(false),
		title,
		width = 'md',
		children,
		footer,
		onclose
	}: {
		open?: boolean;
		title: string;
		width?: 'sm' | 'md' | 'lg';
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	} = $props();

	let dialog: HTMLDialogElement;
	const widths = { sm: 'min(320px,95vw)', md: 'min(580px,95vw)', lg: 'min(1024px,95vw)' };

	$effect(() => {
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	style:width={widths[width]}
	class="m-auto max-h-[calc(100dvh-80px)] max-w-[95vw] flex-col overflow-hidden rounded-[var(--ha-border-radius-3xl,24px)] border-0 bg-card p-0 text-foreground shadow-[var(--ha-shadow-l)] backdrop:bg-[var(--ha-dialog-scrim)] open:flex max-[450px]:h-dvh max-[450px]:max-h-dvh max-[450px]:w-screen! max-[450px]:max-w-none max-[450px]:rounded-none"
	onclose={() => {
		open = false;
		onclose?.();
	}}
	onclick={(e) => e.target === dialog && dialog.close()}
>
	<div class="flex shrink-0 items-center gap-3 px-6 pt-6 pb-4">
		<h2 class="m-0 min-w-0 flex-1 truncate text-[length:var(--ha-font-size-2xl)] leading-[var(--ha-line-height-condensed)] font-normal">
			{title}
		</h2>
		<button type="button" class="ha-icon-button -my-2 -me-3" aria-label="Close" onclick={() => dialog.close()}>
			<HaIcon path={mdiClose} />
		</button>
	</div>
	<div class="min-h-0 flex-1 overflow-auto px-6 pb-6">
		{#if open}{@render children()}{/if}
	</div>
	{#if footer}
		<div class="flex shrink-0 flex-wrap justify-end gap-2 px-6 pb-6">
			{@render footer()}
		</div>
	{/if}
</dialog>
