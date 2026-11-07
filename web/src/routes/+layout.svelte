<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import ConfirmDialog from '#lib/components/confirm-dialog.svelte';
	import Toasts from '#lib/components/toasts.svelte';
	import { connectHomeAssistant } from '#lib/home-assistant.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	connectHomeAssistant();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<ConfirmDialog />
<Toasts />
