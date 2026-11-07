<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import { connectHomeAssistant } from '#lib/home-assistant.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	connectHomeAssistant();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
