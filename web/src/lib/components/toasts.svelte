<script lang="ts">
	import { mdiClose } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';
	import { dismissToast, toasts } from '#lib/ui.svelte.js';

	// ha-toast: bottom center, 16px offset, min 350 / max 650px, inverted surface, 4px radius, large shadow
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-2" aria-live="polite">
	{#each toasts as t (t.id)}
		<div
			role={t.error ? 'alert' : 'status'}
			class="pointer-events-auto flex min-h-12 w-full max-w-[650px] min-w-[min(350px,100%)] items-center gap-2 rounded-sm bg-[var(--ha-color-surface-inverted)] py-2 ps-4 pe-1 text-[var(--ha-color-on-surface-inverted)] shadow-[var(--ha-shadow-l)] sm:w-auto"
		>
			{#if t.error}<span class="size-2 shrink-0 rounded-full bg-[var(--error-color)]"></span>{/if}
			<span class="flex-1 py-1">{t.message}</span>
			<button type="button" aria-label="Dismiss" class="grid size-9 shrink-0 place-items-center rounded-full opacity-80 hover:opacity-100" onclick={() => dismissToast(t.id)}>
				<HaIcon path={mdiClose} size={18} />
			</button>
		</div>
	{/each}
</div>
