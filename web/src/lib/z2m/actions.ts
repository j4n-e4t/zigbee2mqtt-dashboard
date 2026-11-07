// All write operations, with confirmation and toast feedback. UI components call these.
import { z2m } from './store.svelte.js';
import { confirm, run } from '#lib/ui.svelte.js';

export async function restartBridge() {
	const ok = await confirm({
		title: 'Restart Zigbee2MQTT?',
		text: 'The bridge will be unavailable for a short while. Devices keep their state.',
		confirmText: 'Restart'
	});
	if (ok) await run(() => z2m.request('restart'), 'Zigbee2MQTT is restarting');
}
