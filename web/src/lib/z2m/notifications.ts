// Translate bridge events once per connection session; repeated info publishes are silent.
export function createBridgeNotifications(initial: boolean | undefined, notify: (message: string, options?: {error?: boolean; duration?: number}) => void) {
 let previous = initial;
 return (topic: string, payload: unknown) => {
   if (topic === 'bridge/info') {
    const info = payload as { permit_join?: boolean; permit_join_end?: number };
    if (typeof info.permit_join !== 'boolean') return;
    if (previous !== undefined && previous !== info.permit_join) {
     const seconds = info.permit_join_end ? Math.max(0, Math.ceil((info.permit_join_end - Date.now()) / 1000)) : null;
     notify(info.permit_join ? `Joining opened${seconds !== null ? ` for ${seconds}s` : ''}. Put your device in pairing mode.` : 'Joining closed. New devices can no longer join.', { duration: 6000 });
    }
    previous = info.permit_join;
   }
   if (topic === 'bridge/event') {
    const event = payload as { type?: string; data?: { friendly_name?: string; ieee_address?: string; status?: string; supported?: boolean } };
    const name = event.data?.friendly_name ?? event.data?.ieee_address ?? 'Device';
    if (event.type === 'device_joined') notify(`${name} joined the network. Interview will start shortly.`, { duration: 8000 });
    if (event.type === 'device_announce') return;
    if (event.type === 'device_leave') notify(`${name} left the network.`, { duration: 6000 });
    if (event.type === 'device_interview') {
     const status = event.data?.status;
     if (status === 'started') notify(`Interviewing ${name}. Keep the device awake.`, { duration: 6000 });
     if (status === 'successful') notify(`${name}: interview complete${event.data?.supported === false ? '; device is not supported yet' : ', ready to use'}.`, { duration: 8000 });
     if (status === 'failed') notify(`${name}: interview failed. Keep the device awake and retry from its Settings page.`, { error: true });
    }
   }
 };
}
