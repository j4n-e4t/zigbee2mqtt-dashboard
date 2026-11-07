// Subset of Zigbee2MQTT's bridge payload types that the dashboard uses.

export type InterviewState = 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED';

/** Access bits on an expose: STATE = published in the device state, SET = writable, GET = readable on request */
export const ACCESS = { STATE: 1, SET: 2, GET: 4 } as const;

type ExposeBase = {
	name?: string;
	label?: string;
	property?: string;
	access?: number;
	endpoint?: string;
	category?: 'config' | 'diagnostic';
	description?: string;
};
export type NumericExpose = ExposeBase & { type: 'numeric'; unit?: string; value_min?: number; value_max?: number };
export type BinaryExpose = ExposeBase & { type: 'binary'; value_on: unknown; value_off: unknown };
export type EnumExpose = ExposeBase & { type: 'enum'; values: string[] };
export type TextExpose = ExposeBase & { type: 'text' };
export type ListExpose = ExposeBase & { type: 'list' };
/** composite: the value is an object under `property`; specific types (light, switch, ...) group features */
export type FeatureExpose = ExposeBase & {
	type: 'composite' | 'light' | 'switch' | 'lock' | 'climate' | 'fan' | 'cover';
	features: Expose[];
};
export type Expose = NumericExpose | BinaryExpose | EnumExpose | TextExpose | ListExpose | FeatureExpose;

export type DeviceDefinition = {
	model: string;
	vendor: string;
	description: string;
	source?: 'native' | 'generated' | 'external';
	supports_ota?: boolean;
	icon?: string;
	exposes?: Expose[];
};

export type Device = {
	ieee_address: string;
	type: 'Coordinator' | 'Router' | 'EndDevice' | 'Unknown' | 'GreenPower';
	network_address: number;
	supported: boolean;
	disabled: boolean;
	friendly_name: string;
	description?: string;
	definition: DeviceDefinition | null;
	power_source?: string;
	software_build_id?: string;
	date_code?: string;
	model_id?: string;
	manufacturer?: string;
	interviewing: boolean;
	interview_completed: boolean;
	interview_state?: InterviewState;
	endpoints?: Record<string, { clusters?: { input: string[]; output: string[] } }>;
};

export type BridgeInfo = {
	version: string;
	commit?: string;
	zigbee_herdsman?: { version: string };
	zigbee_herdsman_converters?: { version: string };
	coordinator?: { ieee_address: string; type: string; meta?: Record<string, unknown> };
	network?: { channel: number; pan_id: number; extended_pan_id: string | number[] };
	log_level?: string;
	permit_join?: boolean;
	permit_join_end?: number | null;
	restart_required?: boolean;
	config?: {
		mqtt?: { base_topic?: string; server?: string };
		serial?: { port?: string; adapter?: string };
		homeassistant?: boolean | { enabled?: boolean };
		availability?: boolean | { enabled?: boolean };
		advanced?: { last_seen?: string; channel?: number };
	};
};

export type BridgeState = { state: 'online' | 'offline' };

export type DeviceState = Record<string, unknown>;
export type Availability = 'online' | 'offline';

export type GroupMember = { ieee_address: string; endpoint: number };
export type Scene = { id: number; name: string };
export type Group = {
	id: number;
	friendly_name: string;
	description?: string;
	members: GroupMember[];
	scenes: Scene[];
};

export type LogMessage = { level: string; message: string; namespace?: string; time: number };
