<script lang="ts">
 import { onMount } from 'svelte';
 import { z2m } from '#lib/z2m/store.svelte.js';
 import { toast } from '#lib/ui.svelte.js';
 import { createBridgeNotifications } from '#lib/z2m/notifications.js';
 onMount(() => z2m.subscribe(createBridgeNotifications(z2m.info?.permit_join, toast)));
</script>
