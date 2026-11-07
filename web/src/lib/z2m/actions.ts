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

export async function deviceOperation(id: string, operation: 'configure' | 'interview') {
 const ok = await confirm({ title: operation === 'configure' ? 'Reconfigure device?' : 'Re-interview device?', text: 'Keep battery-powered devices awake until this completes.', confirmText: 'Continue' });
 if (ok) await run(() => z2m.request(`device/${operation}`, { id }, { timeoutMs: 180_000 }), 'Device operation completed');
}

export async function removeDevice(id: string) {
 const result = await confirm({ title: 'Remove device?', text: 'The device will leave your Zigbee network.', confirmText: 'Remove', destructive: true, options: [
  { key: 'force', label: 'Force remove', helper: 'Remove from the database even if the device cannot be reached.' },
  { key: 'block', label: 'Block from joining again' },
  { key: 'keep_config', label: 'Keep configuration' },
  { key: 'clear_cache', label: 'Clear cache' }
 ] });
 if (result) return run(() => z2m.request('device/remove', { id, ...result }), 'Device removed');
}
