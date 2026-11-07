<script lang="ts">
	// Home Assistant's ha-svg-icon: a Material Design Icons path in a 24x24 viewBox.
	let { path, size = 24, class: className = '' }: { path: string; size?: number; class?: string } = $props();
</script>

<svg
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="currentColor"
	aria-hidden="true"
	focusable="false"
	class="shrink-0 {className}"
>
	<path d={path} />
</svg>
