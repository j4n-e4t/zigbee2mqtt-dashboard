import {
	mdiBatteryAlertVariantOutline,
	mdiBrightness5,
	mdiCurrentAc,
	mdiDoorClosed,
	mdiDoorOpen,
	mdiEye,
	mdiFlash,
	mdiGauge,
	mdiGestureTapButton,
	mdiLightbulb,
	mdiLightningBolt,
	mdiLock,
	mdiMotionSensor,
	mdiPaletteOutline,
	mdiPower,
	mdiSineWave,
	mdiThermometer,
	mdiThermostat,
	mdiTimerOutline,
	mdiWater,
	mdiWaterPercent
} from '@mdi/js';
import { batteryIcon, lqiIcon } from './format.js';
import { ACCESS, type Device, type DeviceState, type Expose } from './types.js';

/** HA-style entity groups on the device page */
export type ExposeCategory = 'controls' | 'sensors' | 'config' | 'diagnostic';

export type ExposeEntry = {
	key: string;
	label: string;
	property: string;
	value: unknown;
	display: string;
	icon: string;
	category: ExposeCategory;
	expose: Expose;
};

const pretty = (s: string) => {
	const t = s.replace(/_/g, ' ');
	return t.charAt(0).toUpperCase() + t.slice(1);
};

// Binary values with a better wording than "On"/"Off" (true = value_on)
const BINARY_WORDS: Record<string, [string, string]> = {
	occupancy: ['Detected', 'Clear'],
	presence: ['Detected', 'Clear'],
	vibration: ['Detected', 'Clear'],
	smoke: ['Detected', 'Clear'],
	gas: ['Detected', 'Clear'],
	contact: ['Closed', 'Open'],
	water_leak: ['Wet', 'Dry'],
	battery_low: ['Low', 'Normal'],
	tamper: ['Tampered', 'OK'],
	child_lock: ['Locked', 'Unlocked']
};

const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

function format(e: Expose, value: unknown, property: string): string {
	if (value === undefined || value === null) return '—';
	switch (e.type) {
		case 'numeric':
			if (typeof value !== 'number') return String(value);
			return e.unit && e.unit !== 'lqi' ? `${number.format(value)} ${e.unit}` : number.format(value);
		case 'binary': {
			const on = value === e.value_on;
			const off = value === e.value_off;
			const words = BINARY_WORDS[e.name ?? property];
			if (words && (on || off)) return on ? words[0] : words[1];
			if (on) return 'On';
			if (off) return 'Off';
			return String(value);
		}
		case 'enum':
		case 'text':
			return typeof value === 'string' ? pretty(value) : String(value);
		default:
			if (typeof value === 'object') {
				return Object.entries(value as Record<string, unknown>)
					.map(([k, v]) => `${k} ${typeof v === 'number' ? number.format(v) : String(v)}`)
					.join(' · ');
			}
			return String(value);
	}
}

function icon(e: Expose, name: string, value: unknown, parentType?: string): string {
	switch (name) {
		case 'temperature':
		case 'local_temperature':
			return mdiThermometer;
		case 'current_heating_setpoint':
		case 'system_mode':
			return mdiThermostat;
		case 'humidity':
		case 'soil_moisture':
			return mdiWaterPercent;
		case 'pressure':
			return mdiGauge;
		case 'illuminance':
		case 'illuminance_lux':
		case 'brightness':
			return mdiBrightness5;
		case 'occupancy':
		case 'presence':
			return mdiMotionSensor;
		case 'contact':
			return value === false ? mdiDoorOpen : mdiDoorClosed;
		case 'water_leak':
			return mdiWater;
		case 'battery':
			return batteryIcon(typeof value === 'number' ? value : undefined);
		case 'battery_low':
			return mdiBatteryAlertVariantOutline;
		case 'linkquality':
			return lqiIcon(typeof value === 'number' ? value : undefined);
		case 'voltage':
			return mdiSineWave;
		case 'current':
			return mdiCurrentAc;
		case 'power':
			return mdiFlash;
		case 'energy':
			return mdiLightningBolt;
		case 'state':
			return parentType === 'light' ? mdiLightbulb : mdiPower;
		case 'power_on_behavior':
			return mdiPower;
		case 'color_temp':
		case 'color_xy':
		case 'color_hs':
			return mdiPaletteOutline;
		case 'action':
			return mdiGestureTapButton;
		case 'child_lock':
			return mdiLock;
		case 'occupancy_timeout':
			return mdiTimerOutline;
		default:
			return e.type === 'numeric' && e.unit === '°C' ? mdiThermometer : mdiEye;
	}
}

/**
 * Flattens a device's exposes into display rows: specific types (light, switch, climate, ...) are
 * expanded into their features; composites stay one row. Only properties published in the
 * device state (ACCESS.STATE) are listed, since this view only reads.
 */
export function exposeEntries(device: Device, state: DeviceState | undefined): ExposeEntry[] {
	const out: ExposeEntry[] = [];
	const walk = (list: Expose[], parentType?: string, parentEndpoint?: string) => {
		for (const e of list) {
			if ('features' in e && e.type !== 'composite') {
				walk(e.features, e.type, e.endpoint ?? parentEndpoint);
				continue;
			}
			const access = e.access ?? ACCESS.STATE;
			if (!(access & ACCESS.STATE)) continue;
			const property = e.property ?? e.name ?? '';
			if (!property) continue;
			const name = e.name ?? property;
			const endpoint = e.endpoint ?? parentEndpoint;
			const value = state?.[property];
			const category: ExposeCategory =
				e.category === 'config'
					? 'config'
					: e.category === 'diagnostic'
						? 'diagnostic'
						: access & ACCESS.SET
							? 'controls'
							: 'sensors';
			out.push({
				key: property,
				label: (e.label ?? pretty(name)) + (endpoint ? ` (${endpoint})` : ''),
				property,
				value,
				display: format(e, value, property),
				icon: icon(e, name, value, parentType),
				category,
				expose: e
			});
		}
	};
	walk(device.definition?.exposes ?? []);
	return out;
}
