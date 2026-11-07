<script lang="ts">
	// Label/value row used in info cards (like HA's system information rows)
	let { label, value, mono = false }: { label: string; value: string | number | undefined | null; mono?: boolean } = $props();
</script>

<div class="flex min-h-10 items-center justify-between gap-4 py-1">
	<span class="shrink-0">{label}</span>
	<span class="min-w-0 truncate text-end text-muted-foreground {mono ? 'tabular-nums' : ''}" dir="ltr" title={value == null ? undefined : String(value)}>
		{value ?? '—'}
	</span>
</div>
