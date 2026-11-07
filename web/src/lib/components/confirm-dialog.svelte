<script lang="ts">
	import HaDialog from './ha-dialog.svelte';
	import { confirmState } from '#lib/ui.svelte.js';

	// Global confirmation dialog driven by confirm() in #lib/ui.svelte.ts
	let open = $state(false);
	let values = $state<Record<string, boolean>>({});
	let settled = false;

	$effect(() => {
		const req = confirmState.current;
		if (req) {
			values = Object.fromEntries((req.options ?? []).map((o) => [o.key, o.value ?? false]));
			settled = false;
			open = true;
		}
	});

	function finish(result: false | Record<string, boolean>) {
		if (settled) return;
		settled = true;
		confirmState.current?.resolve(result);
		confirmState.current = null;
		open = false;
	}
</script>

{#if confirmState.current}
	{@const req = confirmState.current}
	<HaDialog bind:open title={req.title} onclose={() => finish(false)}>
		{#if req.text}<p class="m-0 whitespace-pre-line text-muted-foreground">{req.text}</p>{/if}
		{#each req.options ?? [] as opt (opt.key)}
			<label class="mt-4 flex cursor-pointer items-start gap-3">
				<input type="checkbox" class="ha-checkbox mt-0.5" bind:checked={values[opt.key]} />
				<span>
					{opt.label}
					{#if opt.helper}<span class="ha-field-helper block">{opt.helper}</span>{/if}
				</span>
			</label>
		{/each}
		{#snippet footer()}
			<button type="button" class="ha-button" data-appearance="plain" onclick={() => finish(false)}>Cancel</button>
			<button
				type="button"
				class="ha-button"
				data-variant={req.destructive ? 'danger' : undefined}
				onclick={() => finish({ ...values })}
			>
				{req.confirmText ?? 'OK'}
			</button>
		{/snippet}
	</HaDialog>
{/if}
