// Helpers for option editing: compute what changed between the original and the edited copy.

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Deep diff for Zigbee2MQTT option requests: returns only changed keys. Keys cleared in the edit
 * (undefined) become `null`, which Z2M treats as "remove this setting".
 */
export function diffOptions(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
	for (const k of keys) {
		const a = before?.[k];
		const b = after?.[k];
		if (isObject(a) && isObject(b)) {
			const sub = diffOptions(a, b);
			if (Object.keys(sub).length) out[k] = sub;
		} else if (b === undefined) {
			if (a !== undefined) out[k] = null;
		} else if (JSON.stringify(a) !== JSON.stringify(b)) {
			out[k] = b;
		}
	}
	return out;
}

export const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
