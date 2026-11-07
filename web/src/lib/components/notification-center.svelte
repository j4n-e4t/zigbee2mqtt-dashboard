<script lang="ts">
 import { mdiBellOutline, mdiClose } from '@mdi/js';
 import HaIcon from './ha-icon.svelte';
 import { notifications, markNotificationsRead, clearNotifications } from '#lib/ui.svelte.js';
 let open = $state(false);
 let root: HTMLDivElement;
 const unread = $derived(notifications.filter(n => !n.read).length);
 function toggle() { open = !open; if (open) markNotificationsRead(); }
</script>
<svelte:window onclick={e => { if (open && root && !root.contains(e.target as Node)) open = false; }} onkeydown={e => { if (e.key === 'Escape') open = false; }}/>
<div class="relative" bind:this={root}>
 <button type="button" class="ha-icon-button relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} aria-controls="notification-history" onclick={toggle}>
  <HaIcon path={mdiBellOutline}/>
  {#if unread}<span class="absolute top-0 right-0 min-w-4 rounded-full bg-[var(--primary-color)] px-1 text-[10px] leading-4 text-[var(--text-primary-color,#fff)]">{unread}</span>{/if}
 </button>
 {#if open}
  <section id="notification-history" aria-label="Notification history" class="fixed top-[var(--header-height)] right-3 z-40 w-[min(420px,calc(100vw-24px))] rounded-lg border border-[var(--divider-color)] bg-card text-foreground shadow-[var(--ha-shadow-l)]">
   <div class="flex items-center gap-2 border-b border-[var(--divider-color)] p-3">
    <h2 class="m-0 flex-1 text-lg font-normal">Notifications</h2>
    <button class="ha-button" data-appearance="plain" data-size="s" disabled={!notifications.length} onclick={clearNotifications}>Clear</button>
    <button class="ha-icon-button" aria-label="Close notifications" onclick={() => open = false}><HaIcon path={mdiClose}/></button>
   </div>
   <div class="max-h-[60vh] overflow-auto">
    {#each notifications as n (n.id)}
     <div class="border-b border-[var(--divider-color)] p-4 last:border-0">
      <div class="mb-1 flex justify-between gap-2 text-xs text-muted-foreground"><span class={n.error ? 'text-error' : ''}>{n.error ? 'Error' : 'Activity'}</span><time datetime={new Date(n.time).toISOString()}>{new Date(n.time).toLocaleTimeString()}</time></div>
      <p class="m-0 whitespace-normal break-words text-sm leading-normal">{n.message}</p>
     </div>
    {:else}<p class="m-0 p-4 text-sm text-muted-foreground">No notifications this session.</p>{/each}
   </div>
  </section>
 {/if}
</div>
