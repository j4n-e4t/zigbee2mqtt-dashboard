<script lang="ts">
	import SectionTabs from '#lib/components/section-tabs.svelte';
	import { page } from '$app/state';
	import PageShell from '#lib/components/page-shell.svelte';
	import HaCard from '#lib/components/ha-card.svelte';
	import SchemaForm, { type JsonSchema } from '#lib/components/schema-form.svelte';
	import SettingsTools from '#lib/components/settings/tools.svelte';
	import SettingsDeveloper from '#lib/components/settings/developer.svelte';
	import RestartBanner from '#lib/components/settings/restart-banner.svelte';
	import { z2m } from '#lib/z2m/store.svelte.js';
	import { clone, diffOptions } from '#lib/z2m/options.js';
	import { run } from '#lib/ui.svelte.js';

	// Query parameters precede the hash route so SvelteKit exposes them in page.url.searchParams.
	const tab = $derived(page.url.searchParams.get('tab') ?? 'settings');
	const section = $derived(page.url.searchParams.get('section'));
	const subTabs = [
		{ key: 'settings', label: 'Settings' },
		{ key: 'tools', label: 'Tools' },
		{ key: 'developer', label: 'Developer' }
	];

	type Info = { config?: Record<string, unknown>; config_schema?: JsonSchema };
	const info = $derived(z2m.info as unknown as Info | null);
	const schema = $derived(info?.config_schema);
	// Device and group entries are edited on their own pages
	const SKIP = new Set(['devices', 'groups']);
	const sections = $derived(
		Object.entries(schema?.properties ?? {}).filter(([k]) => !SKIP.has(k)) as [string, JsonSchema][]
	);
	const current = $derived(sections.find(([k]) => k === section) ?? sections[0]);

	// Edit a copy of the active section; reset whenever the bridge publishes new config
	let draft = $state<Record<string, unknown>>({});
	let original = $state<Record<string, unknown>>({});
	$effect(() => {
		if (!current) return;
		const v = info?.config?.[current[0]];
		// Clone the source twice: reading `original` here would subscribe this effect
		// to the state it replaces, causing an infinite update loop.
		const snapshot = clone({ [current[0]]: v });
		original = snapshot;
		draft = clone(snapshot);
	});
	const changes = $derived(current ? diffOptions(original, draft) : {});
	const dirty = $derived(Object.keys(changes).length > 0);
	let saving = $state(false);

	async function save() {
		if (!current) return;
		saving = true;
		await run(() => z2m.request('options', { options: changes }), 'Settings saved');
		saving = false;
	}
</script>

<PageShell>
 <h1 class="m-0 mb-4 text-2xl font-normal">Settings</h1>
	<RestartBanner />

 <SectionTabs items={subTabs.map(t => ({...t,href:`?tab=${t.key}#/settings`}))} active={tab} />

	{#if tab === 'tools'}
		<SettingsTools />
	{:else if tab === 'developer'}
		<SettingsDeveloper />
	{:else if !schema}
		<HaCard><p class="m-0 text-muted-foreground">{z2m.info ? 'This Zigbee2MQTT version does not publish a settings schema.' : 'Loading…'}</p></HaCard>
	{:else if current}
		<div class="grid items-start gap-4 md:grid-cols-[220px_1fr]">
			<nav class="flex flex-row flex-wrap gap-1 md:flex-col" aria-label="Settings sections">
				{#each sections as [key, s] (key)}
					<a
						href="?tab=settings&section={key}#/settings"
						class="rounded-full px-4 py-2 no-underline md:rounded-md {key === current[0]
							? 'bg-[var(--ha-color-fill-primary-normal-resting)] text-[var(--ha-color-on-primary-normal)]'
							: 'text-foreground hover:bg-hover'}">{s.title ?? key}</a
					>
				{/each}
			</nav>
			<HaCard header={current[1].title ?? current[0]}>
				{#if current[1].description}<p class="m-0 mb-3 text-muted-foreground">{current[1].description}</p>{/if}
				{#key current[0]}
					<SchemaForm schema={{properties:{[current[0]]:current[1]}}} bind:value={draft} root={schema} />
				{/key}
				{#snippet actions()}
					<div class="flex w-full items-center justify-end gap-2">
						{#if dirty}<span class="me-auto ps-2 text-muted-foreground">Unsaved changes</span>{/if}
						<button type="button" class="ha-button" data-appearance="plain" disabled={!dirty || saving} onclick={() => (draft = clone(original))}>Reset</button>
						<button type="button" class="ha-button" disabled={!dirty || saving} onclick={save}>{saving ? 'Saving…' : 'Save'}</button>
					</div>
				{/snippet}
			</HaCard>
		</div>
	{/if}
</PageShell>
