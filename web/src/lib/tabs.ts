import { mdiAccessPoint, mdiCog, mdiDevices, mdiFolderMultipleOutline, mdiInformationOutline, mdiUpdate } from '@mdi/js';

export type Tab = { route: string; href: string; label: string; icon: string };

/** Top-level sections, shown as toolbar tabs (desktop) or a bottom bar (narrow) */
export const TABS: Tab[] = [
	{ route: '/', href: '#/', label: 'Devices', icon: mdiDevices },
	{ route: '/groups', href: '#/groups', label: 'Groups', icon: mdiFolderMultipleOutline },
	{ route: '/ota', href: '#/ota', label: 'OTA', icon: mdiUpdate },
	{ route: '/touchlink', href: '#/touchlink', label: 'Touchlink', icon: mdiAccessPoint },
	{ route: '/settings', href: '#/settings', label: 'Settings', icon: mdiCog },
	{ route: '/info', href: '#/info', label: 'Info', icon: mdiInformationOutline }
];

export const activeTab = (routeId: string | null, tabs: Tab[] = TABS) =>
	tabs.find((t) => t.route === routeId) ?? tabs[0];
