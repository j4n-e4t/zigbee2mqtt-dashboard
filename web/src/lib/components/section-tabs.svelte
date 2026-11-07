<script lang="ts">
 let { items, active, label = 'Page sections' }: {
  items: { key: string; label: string; href: string }[];
  active: string;
  label?: string;
 } = $props();
</script>
<nav aria-label={label} class="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--divider-color)]">
 {#each items as item (item.key)}
  <a href={item.href} aria-current={active === item.key ? 'page' : undefined}
   class="shrink-0 px-4 py-3 text-sm no-underline {active === item.key ? 'text-primary shadow-[inset_0_-2px_0_var(--primary-color)]' : 'text-muted-foreground hover:bg-hover'}">{item.label}</a>
 {/each}
</nav>
