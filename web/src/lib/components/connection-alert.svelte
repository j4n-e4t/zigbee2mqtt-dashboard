<script lang="ts">
	import { mdiAlertCircleOutline } from '@mdi/js';
	import HaIcon from './ha-icon.svelte';
	import { z2m } from '#lib/z2m/store.svelte.js';
</script>

{#if z2m.lastError && z2m.status !== 'open'}
	<!-- ha-alert (error): tinted background, icon in the error color -->
	<div
		role="alert"
		class="m-3 mb-0 flex shrink-0 items-start gap-3 rounded-sm bg-[color-mix(in_srgb,var(--error-color)_12%,transparent)] py-2 pr-2 pl-3 leading-normal"
	>
		<HaIcon path={mdiAlertCircleOutline} class="text-error" />
		<span class="flex-1 self-center">
			{z2m.lastError}. Check <code>Z2M_URL</code> / <code>config.js</code>.
		</span>
	</div>
{/if}
