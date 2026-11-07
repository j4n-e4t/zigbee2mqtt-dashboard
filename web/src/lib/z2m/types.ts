// Subset of Zigbee2MQTT's bridge payload types that the dashboard uses.

export type InterviewState = 'PENDING' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED';

export type DeviceDefinition = {
	model: string;
	vendor: string;
	description: string;
	source?: 'native' | 'generated' | 'external';
	supports_ota?: boolean;
	icon?: string;
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
};

export type BridgeInfo = {
	version: string;
	commit?: string;
	coordinator?: { ieee_address: string; type: string };
	network?: { channel: number; pan_id: number; extended_pan_id: string };
	permit_join?: boolean;
	config?: { mqtt?: { base_topic?: string } };
};

export type BridgeState = { state: 'online' | 'offline' };
