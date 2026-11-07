// Fake device inventory shaped like Zigbee2MQTT's `bridge/devices` payload.
// Models are real so the zigbee2mqtt.io device images resolve.

const ep = (input = [], output = []) => ({ 1: { bindings: [], configured_reportings: [], clusters: { input, output }, scenes: [] } });

const device = ({ ieee, nwk, name, type = 'EndDevice', power = 'Battery', model, vendor, description, source = 'native', icon, modelId, manufacturer, interview = 'SUCCESSFUL', disabled = false, supported = true, swBuild, dateCode, ota = false, desc }) => ({
	ieee_address: ieee,
	type,
	network_address: nwk,
	supported,
	disabled,
	friendly_name: name,
	description: desc,
	definition: model
		? { model, vendor, description, source, supports_ota: ota, exposes: [], options: [], ...(icon ? { icon } : {}) }
		: null,
	power_source: power,
	software_build_id: swBuild,
	date_code: dateCode,
	model_id: modelId,
	manufacturer,
	interviewing: interview === 'IN_PROGRESS',
	interview_completed: interview === 'SUCCESSFUL',
	interview_state: interview,
	endpoints: ep(['genBasic'], ota ? ['genOta'] : [])
});

export const devices = [
	{
		ieee_address: '0x00124b0029aa1234',
		type: 'Coordinator',
		network_address: 0,
		supported: true,
		disabled: false,
		friendly_name: 'Coordinator',
		definition: null,
		interviewing: false,
		interview_completed: true,
		interview_state: 'SUCCESSFUL',
		endpoints: {}
	},
	device({ ieee: '0x000d6ffffe1a2b01', nwk: 11201, name: 'Living Room/Ceiling', type: 'Router', power: 'Mains (single phase)', model: 'LED1545G12', vendor: 'IKEA', description: 'TRADFRI bulb E26/E27, white spectrum, globe, opal, 980 lm', modelId: 'TRADFRI bulb E27 WS opal 980lm', manufacturer: 'IKEA of Sweden', swBuild: '2.3.093', dateCode: '20200122', ota: true }),
	device({ ieee: '0x001788010b2c3d02', nwk: 40122, name: 'Living Room/Floor Lamp', type: 'Router', power: 'Mains (single phase)', model: '9290012573A', vendor: 'Philips', description: 'Hue white and color ambiance E26/E27/E14', modelId: 'LCT015', manufacturer: 'Signify Netherlands B.V.', swBuild: '1.93.11', dateCode: '20210302', ota: true }),
	device({ ieee: '0x000d6ffffe3c4d03', nwk: 5523, name: 'Kitchen/Spots', type: 'Router', power: 'Mains (single phase)', model: 'LED2201G8', vendor: 'IKEA', description: 'TRADFRI bulb GU10, white spectrum, 345 lm', modelId: 'TRADFRI bulb GU10 WS 345lm', manufacturer: 'IKEA of Sweden', swBuild: '1.0.38', ota: true }),
	device({ ieee: '0x00158d0004a1b204', nwk: 60311, name: 'Bedroom/Climate', model: 'WSDCGQ11LM', vendor: 'Aqara', description: 'Temperature and humidity sensor', modelId: 'lumi.weather', manufacturer: 'LUMI', swBuild: '3000-0001', dateCode: '20191205' }),
	device({ ieee: '0x00158d0004c2d305', nwk: 18890, name: 'Hallway/Front Door', model: 'MCCGQ11LM', vendor: 'Aqara', description: 'Door and window sensor', modelId: 'lumi.sensor_magnet.aq2', manufacturer: 'LUMI', dateCode: '20161128', desc: 'Main entrance' }),
	device({ ieee: '0x00158d0004e3f406', nwk: 33017, name: 'Hallway/Motion', model: 'RTCGQ11LM', vendor: 'Aqara', description: 'Motion sensor', modelId: 'lumi.sensor_motion.aq2', manufacturer: 'LUMI', dateCode: '20170627' }),
	device({ ieee: '0x00158d0005f4a507', nwk: 2741, name: 'Bathroom/Leak', model: 'SJCGQ11LM', vendor: 'Aqara', description: 'Water leak sensor', modelId: 'lumi.sensor_wleak.aq1', manufacturer: 'LUMI' }),
	device({ ieee: '0x000b57fffe6b7c08', nwk: 47110, name: 'Bedroom/Switch', model: 'E1743', vendor: 'IKEA', description: 'TRADFRI ON/OFF switch', modelId: 'TRADFRI on/off switch', manufacturer: 'IKEA of Sweden', swBuild: '2.2.010', ota: true }),
	device({ ieee: '0x000b57fffe7c8d09', nwk: 29004, name: 'Living Room/Remote', model: 'E1524/E1810', vendor: 'IKEA', description: 'TRADFRI remote control', modelId: 'TRADFRI remote control', manufacturer: 'IKEA of Sweden', swBuild: '2.3.014', ota: true }),
	device({ ieee: '0x000b57fffe8d9e10', nwk: 51230, name: 'Office/Dimmer', model: 'E1603/E1702/E1708', vendor: 'IKEA', description: 'TRADFRI control outlet', type: 'Router', power: 'Mains (single phase)', modelId: 'TRADFRI control outlet', manufacturer: 'IKEA of Sweden', swBuild: '2.3.089', ota: true }),
	device({ ieee: '0x0017880109af0b11', nwk: 8812, name: 'Bedroom/Hue Dimmer', model: '324131092621', vendor: 'Philips', description: 'Hue dimmer switch', modelId: 'RWL021', manufacturer: 'Signify Netherlands B.V.', swBuild: '6.1.1.28573', ota: true }),
	device({ ieee: '0x00124b0022ab1c12', nwk: 14590, name: 'Office/Climate', model: 'SNZB-02', vendor: 'SONOFF', description: 'Temperature and humidity sensor', modelId: 'TH01', manufacturer: 'eWeLink', dateCode: '20201026' }),
	device({ ieee: '0xa4c138bcd2e3f413', nwk: 61002, name: 'Office/Desk Plug', type: 'Router', power: 'Mains (single phase)', model: 'TS011F_plug_1', vendor: 'Tuya', description: 'Smart plug (with power monitoring)', modelId: 'TS011F', manufacturer: '_TZ3000_gjnozsaz', swBuild: '0122052017' }),
	device({ ieee: '0xa4c138cde3f4a514', nwk: 3390, name: 'Bedroom/Radiator', model: 'TS0601_thermostat', vendor: 'Tuya', description: 'Radiator valve with thermostat', modelId: 'TS0601', manufacturer: '_TZE200_ckud7u2l', disabled: true, desc: 'Disabled for the summer' }),
	// Native definition, but zigbee2mqtt.io has no image for it -> exercises fallback
	device({ ieee: '0x00124b0025de6f15', nwk: 7754, name: 'Garage/Light Switch', type: 'Router', power: 'Mains (single phase)', model: 'ZBMINI-L2', vendor: 'SONOFF', description: 'Zigbee smart switch (no neutral)', modelId: 'ZBMINIL2', manufacturer: 'SONOFF' }),
	// External converter with a custom icon served by Z2M (relative path)
	device({ ieee: '0x8c65a3fffe1f2a16', nwk: 22458, name: 'Garden/Soil Sensor', model: 'DIY-SOIL-01', vendor: 'Custom devices (DiY)', description: 'DIY capacitive soil moisture sensor', source: 'external', icon: 'device_icons/diy-soil.svg', modelId: 'DIY_SOIL', manufacturer: 'DIY' }),
	// Unsupported device -> Z2M generates a definition
	device({ ieee: '0x54ef44100031b217', nwk: 39871, name: '0x54ef44100031b217', type: 'Router', power: 'Mains (single phase)', model: 'TS0002', vendor: 'Tuya', description: 'Automatically generated definition', source: 'generated', supported: false, modelId: 'TS0002', manufacturer: '_TZ3000_unknown' }),
	// Interview failed -> no definition
	device({ ieee: '0x0c4314fffe2a3b18', nwk: 12004, name: '0x0c4314fffe2a3b18', interview: 'FAILED', supported: false, power: undefined })
];

export const bridgeInfo = {
	version: '2.6.3',
	commit: 'mock',
	zigbee_herdsman: { version: '4.4.1' },
	zigbee_herdsman_converters: { version: '25.30.0' },
	coordinator: { ieee_address: '0x00124b0029aa1234', type: 'zStack3x0', meta: { revision: 20230507, transportrev: 2, product: 1, majorrel: 2, minorrel: 7, maintrel: 1 } },
	network: { channel: 15, pan_id: 6754, extended_pan_id: '0xdddddddddddddddd' },
	log_level: 'info',
	permit_join: false,
	permit_join_end: null,
	restart_required: false,
	config: { mqtt: { base_topic: 'zigbee2mqtt', server: 'mqtt://mock' }, frontend: { enabled: true, port: 8080 }, advanced: { channel: 15 } },
	config_schema: {}
};

export const groups = [
	{ id: 1, friendly_name: 'Living Room Lights', members: [{ ieee_address: '0x000d6ffffe1a2b01', endpoint: 1 }, { ieee_address: '0x001788010b2c3d02', endpoint: 11 }], scenes: [] }
];
