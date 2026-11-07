<script lang="ts">
 import type {Snippet} from 'svelte';
 import {mdiMagnify, mdiClose} from '@mdi/js';
 import HaIcon from './ha-icon.svelte';
 import {ha} from '#lib/home-assistant.svelte.js';
 let {query=$bindable(''),label,placeholder=label,children}:{query:string;label:string;placeholder?:string;children?:Snippet}=$props();
</script>
<div class="mb-4 flex h-14 items-center gap-2">
 <label class="flex min-w-0 flex-1 items-center gap-2 border border-[var(--ha-color-border-neutral-quiet)] bg-card px-2 text-muted-foreground transition-colors hover:border-[var(--ha-color-border-neutral-normal)] focus-within:border-primary {ha.narrow?'h-10 rounded-md':'h-8 rounded-[10px]'}">
  <HaIcon path={mdiMagnify} size={20}/>
  <input type="search" bind:value={query} aria-label={label} {placeholder} class="h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-[var(--ha-color-placeholder)] [&::-webkit-search-cancel-button]:hidden"/>
  {#if query}<button type="button" aria-label="Clear search" class="grid place-items-center rounded-full hover:text-foreground" onclick={()=>query=''}><HaIcon path={mdiClose} size={18}/></button>{/if}
 </label>
 {@render children?.()}
</div>
