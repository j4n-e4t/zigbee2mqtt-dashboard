<script lang="ts">
	import type { Device } from '#lib/z2m/types.js';

	// ha-label chips for a device's support / interview / definition state
	let { device: d }: { device: Device } = $props();
</script>

<div class="flex flex-wrap gap-1">
	{#if d.interview_state === 'FAILED'}
		<span class="ha-label" data-tone="danger">Interview failed</span>
	{:else if d.interviewing || d.interview_state === 'IN_PROGRESS'}
		<span class="ha-label" data-tone="primary">Interviewing</span>
	{:else if !d.supported && d.type !== 'Coordinator'}
		<span class="ha-label" data-tone="warning">Unsupported</span>
	{/if}
	{#if d.disabled}<span class="ha-label" data-tone="neutral">Disabled</span>{/if}
	{#if d.definition?.source === 'generated'}<span class="ha-label">Generated</span>{/if}
	{#if d.definition?.source === 'external'}<span class="ha-label">External</span>{/if}
	{#if d.definition?.supports_ota}<span class="ha-label">OTA</span>{/if}
</div>
