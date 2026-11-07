import {
	mdiBattery,
	mdiBattery10,
	mdiBattery20,
	mdiBattery30,
	mdiBattery40,
	mdiBattery50,
	mdiBattery60,
	mdiBattery70,
	mdiBattery80,
	mdiBattery90,
	mdiBatteryAlertVariantOutline,
	mdiBatteryUnknown,
	mdiSignalCellular1,
	mdiSignalCellular2,
	mdiSignalCellular3,
	mdiSignalCellularOutline
} from '@mdi/js';
import type { Device, DeviceState } from './types.js';

export const hex = (n: number, width = 4) => `0x${n.toString(16).padStart(width, '0')}`;

export const typeLabel = (d: Device) => (d.type === 'EndDevice' ? 'End device' : d.type);

export const isBatteryPowered = (d: Device) => d.power_source === 'Battery';

// --- battery ---------------------------------------------------------------------------------
const LOW_BATTERY = 20;
const batteryIcons = [mdiBattery10, mdiBattery20, mdiBattery30, mdiBattery40, mdiBattery50, mdiBattery60, mdiBattery70, mdiBattery80, mdiBattery90];

export const batteryLevel = (state: DeviceState | undefined): number | undefined =>
	typeof state?.battery === 'number' ? state.battery : undefined;

/** Low when the device says so (battery_low) or the level is at/below 20% */
export const isLowBattery = (state: DeviceState | undefined) => {
	const level = batteryLevel(state);
	return state?.battery_low === true || (level !== undefined && level <= LOW_BATTERY);
};

/** Same 10% steps as Home Assistant's battery icon */
export function batteryIcon(level: number | undefined) {
	if (level === undefined) return mdiBatteryUnknown;
	if (level <= 5) return mdiBatteryAlertVariantOutline;
	if (level >= 95) return mdiBattery;
	return batteryIcons[Math.max(0, Math.min(8, Math.round(level / 10) - 1))];
}

// --- link quality (0-255) ----------------------------------------------------------------------
export const WEAK_LQI = 50;
export const linkQuality = (state: DeviceState | undefined): number | undefined =>
	typeof state?.linkquality === 'number' ? state.linkquality : undefined;

export function lqiIcon(lqi: number | undefined) {
	if (lqi === undefined || lqi === 0) return mdiSignalCellularOutline;
	if (lqi < WEAK_LQI) return mdiSignalCellular1;
	if (lqi < 120) return mdiSignalCellular2;
	return mdiSignalCellular3;
}

// --- last seen ---------------------------------------------------------------------------------
/** Z2M sends last_seen as ISO string or epoch ms, depending on advanced.last_seen */
export function lastSeen(state: DeviceState | undefined): Date | undefined {
	const v = state?.last_seen;
	if (typeof v === 'number') return new Date(v);
	if (typeof v === 'string') {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? undefined : d;
	}
	return undefined;
}

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	['year', 365 * 24 * 3600],
	['month', 30 * 24 * 3600],
	['week', 7 * 24 * 3600],
	['day', 24 * 3600],
	['hour', 3600],
	['minute', 60]
];

export function relativeTime(date: Date, now: number) {
	const seconds = Math.round((date.getTime() - now) / 1000);
	if (Math.abs(seconds) < 60) return 'just now';
	for (const [unit, size] of UNITS) {
		if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
	}
	return rtf.format(seconds, 'second');
}

export const formatDateTime = (d: Date) =>
	d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

// --- docs ----------------------------------------------------------------------------------------
/** zigbee2mqtt.io device page, e.g. E1524/E1810 -> /devices/E1524_E1810.html */
export const deviceDocsUrl = (model: string) =>
	`https://www.zigbee2mqtt.io/devices/${encodeURIComponent(model.replace(/\//g, '_'))}.html`;
