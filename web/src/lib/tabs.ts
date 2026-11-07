import { mdiDevices, mdiInformationOutline } from '@mdi/js';

/** Top-level sections, shown as toolbar tabs (desktop) or a bottom bar (narrow) */
export const TABS = [
	{ route: '/', href: '#/', label: 'Devices', icon: mdiDevices },
	{ route: '/info', href: '#/info', label: 'Info', icon: mdiInformationOutline }
];

export const activeTab = (routeId: string | null) => TABS.find((t) => t.route === routeId) ?? TABS[0];
