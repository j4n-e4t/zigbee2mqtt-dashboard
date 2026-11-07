import { z2m } from './store.svelte.js';
import { run } from '#lib/ui.svelte.js';

// Shared between the toolbar and banner, including while changing pages.
export const joining = $state({ pending: false });
export async function setPermitJoin(time: number, device?: string) {
 if (joining.pending) return;
 joining.pending = true;
 try {
  await run(() => z2m.request('permit_join', { time, ...(device ? { device } : {}) }));
 } finally { joining.pending = false; }
}
