import type { Device } from './types.js';

// Same image sources and order as the official frontend / Windfront:
//   1. definition.icon (external converters, custom icons)
//   2. zigbee2mqtt.io device image by model
//   3. zigbee2mqtt.io vendor image (non-native definitions only)
//   4. local generic fallback (handled by the component)
const DEVICE_IMAGE_BASE = 'https://www.zigbee2mqtt.io/images/devices/';
const VENDOR_IMAGE_BASE = 'https://www.zigbee2mqtt.io/images/vendors/';

const sanitize = (s: string) => s.replace(/:|\s|\//g, '-');

export function deviceImageSources(device: Device, z2mHttpBase: string): string[] {
	const def = device.definition;
	const list: string[] = [];
	if (!def) return list;

	if (def.icon) {
		// Relative icons (e.g. "device_icons/foo.png") are served by Z2M itself.
		// Templated icons may reference ${model} / ${zigbeeModel}.
		const icon = def.icon
			.replaceAll('${model}', sanitize(def.model))
			.replaceAll('${zigbeeModel}', sanitize(device.model_id ?? ''));
		try {
			list.push(new URL(icon, z2mHttpBase).toString());
		} catch {
			// ignore malformed icon values
		}
	}

	list.push(`${DEVICE_IMAGE_BASE}${sanitize(def.model)}.png`);

	if (def.source && def.source !== 'native') {
		list.push(`${VENDOR_IMAGE_BASE}${sanitize(def.vendor)}.png`);
	}

	return list;
}
