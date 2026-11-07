<script lang="ts" module>
	export type JsonSchema = {
		type?: string | string[];
		title?: string;
		description?: string;
		properties?: Record<string, JsonSchema>;
		items?: JsonSchema;
		enum?: unknown[];
		oneOf?: JsonSchema[];
		anyOf?: JsonSchema[];
		default?: unknown;
		minimum?: number;
		maximum?: number;
		readOnly?: boolean;
		requiresRestart?: boolean;
		examples?: unknown[];
		additionalProperties?: unknown;
		patternProperties?: unknown;
		$ref?: string;
		required?: string[];
	};

	/** First non-null JSON type of a schema */
	export function schemaType(s: JsonSchema): string | undefined {
		const t = Array.isArray(s.type) ? s.type.find((x) => x !== 'null') : s.type;
		if (t) return t;
		if (s.enum) return typeof s.enum[0];
		if (s.properties) return 'object';
		return undefined;
	}
</script>

<script lang="ts">
	import Self from './schema-form.svelte';

	// Renders a (Zigbee2MQTT settings) JSON schema as HA settings rows. Edits `value` in place;
	// callers diff it against the original to build the request.
	let {
		schema,
		value = $bindable(),
		root,
		depth = 0,
		disabled = false
	}: { schema: JsonSchema; value: Record<string, unknown>; root?: JsonSchema; depth?: number; disabled?: boolean } = $props();

	const rootSchema = $derived(root ?? schema);

	function resolve(s: JsonSchema): JsonSchema {
		if (!s.$ref) return s;
		const path = s.$ref.replace(/^#\//, '').split('/');
		let cur: unknown = rootSchema;
		for (const p of path) cur = (cur as Record<string, unknown>)?.[p];
		return { ...(cur as JsonSchema), ...s, $ref: undefined };
	}

	const entries = $derived(Object.entries(schema.properties ?? {}).map(([k, s]) => [k, resolve(s)] as const));

	/** Map / union / unknown shapes: edited as JSON */
	const isJson = (s: JsonSchema) => {
		const t = schemaType(s);
		if (s.oneOf || s.anyOf) return true;
		if (t === 'object') return !s.properties || !!s.patternProperties || !!s.additionalProperties;
		if (t === 'array') return !s.items || !['string', 'number', 'integer'].includes(schemaType(s.items) ?? '');
		return !t;
	};

	let jsonErrors = $state<Record<string, string>>({});
	function setJson(key: string, text: string) {
		try {
			value[key] = text.trim() === '' ? undefined : JSON.parse(text);
			delete jsonErrors[key];
		} catch {
			jsonErrors[key] = 'Invalid JSON';
		}
	}
	const asObject = (key: string) => {
		if (!value[key] || typeof value[key] !== 'object') value[key] = {};
		return value[key] as Record<string, unknown>;
	};
</script>

{#snippet label(key: string, s: JsonSchema)}
	<div class="min-w-0 flex-1">
		<div class="break-words">
			{s.title ?? key}
			{#if s.requiresRestart}<span class="ha-label ms-1 align-middle" data-tone="warning" title="Changing this requires a restart">Restart</span>{/if}
		</div>
		{#if s.description}<div class="mt-0.5 text-[length:var(--ha-font-size-s)] text-muted-foreground">{s.description}</div>{/if}
	</div>
{/snippet}

<div class="flex flex-col {depth ? 'gap-1' : 'gap-2'}">
	{#each entries as [key, s] (key)}
		{@const t = schemaType(s)}
		{@const ro = disabled || !!s.readOnly}
		{#if t === 'object' && !isJson(s)}
			<fieldset class="m-0 mt-2 min-w-0 rounded-[var(--ha-border-radius-md)] border border-[var(--divider-color)] p-3">
				<legend class="px-1 font-medium">{s.title ?? key}</legend>
				{#if s.description}<div class="mb-2 text-[length:var(--ha-font-size-s)] text-muted-foreground">{s.description}</div>{/if}
				<Self schema={s} value={asObject(key)} root={rootSchema} depth={depth + 1} {disabled} />
			</fieldset>
		{:else if t === 'boolean'}
			<label class="flex min-h-12 items-center gap-4 py-1">
				{@render label(key, s)}
				<input
					type="checkbox"
					class="ha-switch"
					disabled={ro}
					checked={(value[key] ?? s.default ?? false) === true}
					onchange={(e) => (value[key] = e.currentTarget.checked)}
				/>
			</label>
		{:else if s.enum}
			<label class="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 py-1">
				{@render label(key, s)}
				<select
					class="ha-input w-full sm:w-56"
					disabled={ro}
					value={value[key] === undefined ? '' : String(value[key])}
					onchange={(e) => {
						const v = e.currentTarget.value;
						value[key] = v === '' ? undefined : (s.enum!.find((x) => String(x) === v) ?? v);
					}}
				>
					<option value="">{s.default !== undefined ? `Default (${s.default})` : '—'}</option>
					{#each s.enum as opt (String(opt))}<option value={String(opt)}>{String(opt)}</option>{/each}
				</select>
			</label>
		{:else if t === 'number' || t === 'integer'}
			<label class="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 py-1">
				{@render label(key, s)}
				<input
					type="number"
					class="ha-input w-full sm:w-56"
					disabled={ro}
					min={s.minimum}
					max={s.maximum}
					step={t === 'integer' ? 1 : 'any'}
					placeholder={s.default !== undefined ? String(s.default) : ''}
					value={typeof value[key] === 'number' ? value[key] : ''}
					onchange={(e) => (value[key] = e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value))}
				/>
			</label>
		{:else if t === 'string'}
			<label class="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 py-1">
				{@render label(key, s)}
				<input
					type="text"
					class="ha-input w-full sm:w-72"
					disabled={ro}
					placeholder={s.default !== undefined ? String(s.default) : s.examples?.length ? String(s.examples[0]) : ''}
					value={typeof value[key] === 'string' ? value[key] : ''}
					onchange={(e) => (value[key] = e.currentTarget.value === '' ? undefined : e.currentTarget.value)}
				/>
			</label>
		{:else if t === 'array' && !isJson(s)}
			{@const itemType = schemaType(s.items!)}
			<label class="flex flex-col gap-1 py-1">
				{@render label(key, s)}
				<textarea
					class="ha-input min-h-20! font-mono"
					disabled={ro}
					placeholder="One value per line"
					value={Array.isArray(value[key]) ? (value[key] as unknown[]).join('\n') : ''}
					onchange={(e) => {
						const lines = e.currentTarget.value.split('\n').map((l) => l.trim()).filter(Boolean);
						value[key] = itemType === 'string' ? lines : lines.map(Number);
					}}
				></textarea>
			</label>
		{:else}
			<label class="flex flex-col gap-1 py-1">
				{@render label(key, s)}
				<textarea
					class="ha-input min-h-20! font-mono"
					disabled={ro}
					placeholder="JSON"
					value={value[key] === undefined ? '' : JSON.stringify(value[key], null, 2)}
					onchange={(e) => setJson(key, e.currentTarget.value)}
				></textarea>
				{#if jsonErrors[key]}<span class="text-[length:var(--ha-font-size-s)] text-error">{jsonErrors[key]}</span>{/if}
			</label>
		{/if}
	{/each}
</div>
