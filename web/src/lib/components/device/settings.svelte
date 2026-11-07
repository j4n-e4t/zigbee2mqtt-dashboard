<script lang="ts">
 import HaCard from '#lib/components/ha-card.svelte';
 import SchemaForm, { type JsonSchema } from '#lib/components/schema-form.svelte';
 import type { Device } from '#lib/z2m/types.js';
 import { z2m } from '#lib/z2m/store.svelte.js';
 import { clone, diffOptions } from '#lib/z2m/options.js';
 import { run } from '#lib/ui.svelte.js';
 import { deviceOperation, removeDevice } from '#lib/z2m/actions.js';
 let { device }: { device: Device } = $props();
 const info = $derived(z2m.info as unknown as {config_schema?: JsonSchema & {definitions?: Record<string, JsonSchema>}; config?: { devices?: Record<string, Record<string, unknown>>; homeassistant?: boolean | {enabled?: boolean} }} | null);
 const schema = $derived.by(() => {
  const base = info?.config_schema?.definitions?.device;
  const properties = { ...base?.properties };
  delete properties.friendly_name;
  properties.description = {type:'string',title:'Description'};
  const options = (device.definition as (Device['definition'] & {options?: import('#lib/z2m/types.js').Expose[]}) )?.options ?? [];
  for (const option of options) {
   const key = option.property ?? option.name;
   if (!key) continue;
   properties[key] = {title:option.label ?? key, description:option.description,
    ...(option.type === 'numeric' ? {type:'number',minimum:option.value_min,maximum:option.value_max} :
      option.type === 'binary' ? {enum:[option.value_off,option.value_on]} :
      option.type === 'enum' ? {type:'string',enum:option.values} :
      option.type === 'text' ? {type:'string'} : {type:'object'})};
  }
  return {type:'object', properties} satisfies JsonSchema;
 });
 let name = $state('');
 let haRename = $state(false);
 let original = $state<Record<string, unknown>>({});
 let draft = $state<Record<string, unknown>>({});
 let busy = $state(false);
 $effect(() => { name = device.friendly_name; });
 $effect(() => {
  const snapshot = clone(info?.config?.devices?.[device.ieee_address] ?? {description:device.description ?? ''});
  original = snapshot;
  draft = clone(snapshot);
 });
 const changes = $derived(diffOptions(original,draft));
 const unavailable = $derived(busy || device.interviewing || device.interview_state === 'IN_PROGRESS' || device.interview_state === 'PENDING' || z2m.deviceStates[device.friendly_name]?.update && (z2m.deviceStates[device.friendly_name]?.update as {state?:string}).state === 'updating');
 async function rename() {
  busy = true;
  await run(() => z2m.request('device/rename',{from:device.friendly_name,to:name.trim(),homeassistant_rename:haRename}), 'Device renamed');
  busy = false;
 }
 async function save() {
  busy = true;
  await run(() => z2m.request('device/options',{id:device.ieee_address,options:changes}), 'Device settings saved');
  busy = false;
 }
 async function operate(op: 'configure' | 'interview' | 'remove') {
  busy = true;
  try { if (op === 'remove') await removeDevice(device.ieee_address); else await deviceOperation(device.ieee_address,op); }
  finally { busy = false; }
 }
</script>

<div class="grid gap-4">
 <HaCard header="Device name">
  <form class="grid gap-3" onsubmit={(event) => {event.preventDefault(); void rename();}}>
   <label class="grid gap-1">Friendly name<input class="ha-input" bind:value={name} required disabled={busy} /></label>
   {#if info?.config?.homeassistant === true || (typeof info?.config?.homeassistant === 'object' && info.config.homeassistant.enabled)}
    <label><input type="checkbox" bind:checked={haRename} disabled={busy} /> Update Home Assistant entity IDs</label>
   {/if}
   <button class="ha-button justify-self-start" disabled={busy || !name.trim() || name.trim() === device.friendly_name}>Rename</button>
  </form>
 </HaCard>
 <HaCard header="Device options">
  {#if schema && info?.config_schema}
   <SchemaForm {schema} root={info.config_schema} bind:value={draft} disabled={busy} />
  {:else}
   <label class="grid gap-1">Description<input class="ha-input" bind:value={draft.description} disabled={busy} /></label>
  {/if}
  {#snippet actions()}
   <button class="ha-button" data-appearance="plain" disabled={busy || !Object.keys(changes).length} onclick={() => draft = clone(original)}>Reset</button>
   <button class="ha-button" disabled={busy || !Object.keys(changes).length} onclick={save}>Save options</button>
  {/snippet}
 </HaCard>
 {#if device.type !== 'Coordinator'}
  <HaCard header="Device maintenance">
   <p class="m-0 mb-4 text-muted-foreground">Keep battery-powered devices awake during configuration or interview.</p>
   <div class="flex flex-wrap gap-2">
    <button class="ha-button" disabled={!!unavailable} onclick={() => operate('configure')}>Reconfigure</button>
    <button class="ha-button" disabled={!!unavailable} onclick={() => operate('interview')}>Re-interview</button>
    <button class="ha-button" data-variant="danger" disabled={busy} onclick={() => operate('remove')}>Remove device</button>
   </div>
  </HaCard>
 {/if}
</div>
