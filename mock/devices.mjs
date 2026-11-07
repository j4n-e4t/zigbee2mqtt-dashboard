// Fake device inventory shaped like Zigbee2MQTT's `bridge/devices` payload, plus
// per-device state and availability. Models are real so the zigbee2mqtt.io images resolve.

// --- expose builders (same shape as zigbee-herdsman-converters' exposes) -------------------
const A = { STATE: 1, SET: 2, GET: 4 };
const numeric = (name, label, unit, extra = {}) => ({ type: 'numeric', name, property: name, label, access: A.STATE, ...(unit ? { unit } : {}), ...extra });
const binary = (name, label, on = true, off = false, extra = {}) => ({ type: 'binary', name, property: name, label, access: A.STATE, value_on: on, value_off: off, ...extra });
const enumx = (name, label, values, extra = {}) => ({ type: 'enum', name, property: name, label, access: A.STATE, values, ...extra });
const battery = () => numeric('battery', 'Battery', '%', { category: 'diagnostic', value_min: 0, value_max: 100 });
const batteryLow = () => binary('battery_low', 'Battery low', true, false, { category: 'diagnostic' });
const voltage = () => numeric('voltage', 'Voltage', 'mV', { category: 'diagnostic' });
const lqi = () => numeric('linkquality', 'Linkquality', 'lqi', { category: 'diagnostic', value_min: 0, value_max: 255 });
const onOff = () => ({ type: 'switch', features: [binary('state', 'State', 'ON', 'OFF', { access: A.STATE | A.SET | A.GET })] });
const light = (colorTemp, color) => ({
	type: 'light',
	features: [
		binary('state', 'State', 'ON', 'OFF', { access: 7 }),
		numeric('brightness', 'Brightness', undefined, { access: 7, value_min: 0, value_max: 254 }),
		...(colorTemp ? [numeric('color_temp', 'Color temp', 'mired', { access: 7, value_min: 250, value_max: 454 })] : []),
		...(color ? [{ type: 'composite', name: 'color_xy', property: 'color', label: 'Color (X/Y)', access: 7, features: [numeric('x', 'X', undefined, { access: 7 }), numeric('y', 'Y', undefined, { access: 7 })] }] : [])
	]
});
const powerOnBehavior = () => enumx('power_on_behavior', 'Power-on behavior', ['off', 'on', 'toggle', 'previous'], { access: 7, category: 'config' });
const action = (values) => enumx('action', 'Action', values);

// --- profiles: exposes + a plausible state per model -----------------------------------------
const profiles = {
	bulb_ws: { exposes: [light(true, false), powerOnBehavior(), lqi()], state: { state: 'ON', brightness: 180, color_temp: 370, power_on_behavior: 'previous' } },
	bulb_color: { exposes: [light(true, true), powerOnBehavior(), lqi()], state: { state: 'OFF', brightness: 254, color_temp: 300, color: { x: 0.4573, y: 0.41 }, power_on_behavior: 'on' } },
	climate: { exposes: [numeric('temperature', 'Temperature', '°C'), numeric('humidity', 'Humidity', '%'), numeric('pressure', 'Pressure', 'hPa'), battery(), voltage(), lqi()], state: { temperature: 21.4, humidity: 48.2, pressure: 1012.6, battery: 87, voltage: 3005 } },
	climate_sonoff: { exposes: [numeric('temperature', 'Temperature', '°C'), numeric('humidity', 'Humidity', '%'), battery(), voltage(), lqi()], state: { temperature: 23.1, humidity: 41.7, battery: 64, voltage: 2900 } },
	contact: { exposes: [binary('contact', 'Contact'), battery(), voltage(), lqi()], state: { contact: true, battery: 100, voltage: 3065 } },
	motion: { exposes: [binary('occupancy', 'Occupancy'), numeric('illuminance', 'Illuminance', 'lx'), numeric('occupancy_timeout', 'Occupancy timeout', 's', { access: 7, category: 'config' }), battery(), voltage(), lqi()], state: { occupancy: false, illuminance: 34, occupancy_timeout: 90, battery: 12, voltage: 2785, battery_low: true } },
	leak: { exposes: [binary('water_leak', 'Water leak'), batteryLow(), battery(), voltage(), lqi()], state: { water_leak: false, battery_low: false, battery: 91, voltage: 3015 } },
	remote_onoff: { exposes: [action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']), battery(), lqi()], state: { action: 'on', battery: 74 } },
	remote_5btn: { exposes: [action(['toggle', 'brightness_up_click', 'brightness_down_click', 'arrow_left_click', 'arrow_right_click']), battery(), lqi()], state: { action: 'toggle', battery: 5 } },
	hue_dimmer: { exposes: [action(['on_press', 'off_press', 'up_press', 'down_press']), battery(), lqi()], state: { action: 'up_press', battery: 100 } },
	outlet: { exposes: [onOff(), powerOnBehavior(), lqi()], state: { state: 'ON', power_on_behavior: 'previous' } },
	plug_power: { exposes: [onOff(), numeric('power', 'Power', 'W'), numeric('energy', 'Energy', 'kWh'), numeric('voltage', 'Voltage', 'V'), numeric('current', 'Current', 'A'), powerOnBehavior(), lqi()], state: { state: 'ON', power: 64.2, energy: 12.84, voltage: 231.4, current: 0.31, power_on_behavior: 'previous' } },
	trv: { exposes: [{ type: 'climate', features: [numeric('local_temperature', 'Local temperature', '°C'), numeric('current_heating_setpoint', 'Current heating setpoint', '°C', { access: 3 }), enumx('system_mode', 'System mode', ['heat', 'auto', 'off'], { access: 3 })] }, binary('child_lock', 'Child lock', 'LOCK', 'UNLOCK', { access: 3, category: 'config' }), battery(), lqi()], state: { local_temperature: 19.5, current_heating_setpoint: 17, system_mode: 'off', child_lock: 'UNLOCK', battery: 55 } },
	relay: { exposes: [onOff(), lqi()], state: { state: 'OFF' } },
	diy_soil: { exposes: [numeric('soil_moisture', 'Soil moisture', '%'), numeric('temperature', 'Temperature', '°C'), battery(), lqi()], state: { soil_moisture: 38, temperature: 14.2, battery: 80 } },
	generated: { exposes: [{ type: 'switch', endpoint: 'l1', features: [binary('state', 'State', 'ON', 'OFF', { property: 'state_l1', access: 7, endpoint: 'l1' })] }, { type: 'switch', endpoint: 'l2', features: [binary('state', 'State', 'ON', 'OFF', { property: 'state_l2', access: 7, endpoint: 'l2' })] }, lqi()], state: { state_l1: 'ON', state_l2: 'OFF' } }
};

const ep = (input = [], output = []) => ({ 1: { bindings: [], configured_reportings: [], clusters: { input, output }, scenes: [] } });

const MIN = 60_000;
// ageMs: how long ago the device was last seen; offline: availability state
const device = ({ ieee, nwk, name, type = 'EndDevice', power = 'Battery', model, vendor, description, source = 'native', icon, modelId, manufacturer, interview = 'SUCCESSFUL', disabled = false, supported = true, swBuild, dateCode, ota = false, desc, profile, lq = 120, ageMs = 5 * MIN, offline = false }) => ({
	ieee_address: ieee,
	type,
	network_address: nwk,
	supported,
	disabled,
	friendly_name: name,
	description: desc,
	definition: model
		? { model, vendor, description, source, supports_ota: ota, exposes: profiles[profile]?.exposes ?? [lqi()], options: [], ...(icon ? { icon } : {}) }
		: null,
	power_source: power,
	software_build_id: swBuild,
	date_code: dateCode,
	model_id: modelId,
	manufacturer,
	interviewing: interview === 'IN_PROGRESS',
	interview_completed: interview === 'SUCCESSFUL',
	interview_state: interview,
	endpoints: ep(['genBasic'], ota ? ['genOta'] : []),
	// mock-only, stripped before sending
	_mock: { state: { ...(profiles[profile]?.state ?? {}), linkquality: lq }, ageMs, offline }
});

const raw = [
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
	device({ ieee: '0x000d6ffffe1a2b01', nwk: 11201, name: 'Living Room/Ceiling', type: 'Router', power: 'Mains (single phase)', model: 'LED1545G12', vendor: 'IKEA', description: 'TRADFRI bulb E26/E27, white spectrum, globe, opal, 980 lm', modelId: 'TRADFRI bulb E27 WS opal 980lm', manufacturer: 'IKEA of Sweden', swBuild: '2.3.093', dateCode: '20200122', ota: true, profile: 'bulb_ws', lq: 196, ageMs: 0.5 * MIN }),
	device({ ieee: '0x001788010b2c3d02', nwk: 40122, name: 'Living Room/Floor Lamp', type: 'Router', power: 'Mains (single phase)', model: '9290012573A', vendor: 'Philips', description: 'Hue white and color ambiance E26/E27/E14', modelId: 'LCT015', manufacturer: 'Signify Netherlands B.V.', swBuild: '1.93.11', dateCode: '20210302', ota: true, profile: 'bulb_color', lq: 228, ageMs: 1 * MIN }),
	device({ ieee: '0x000d6ffffe3c4d03', nwk: 5523, name: 'Kitchen/Spots', type: 'Router', power: 'Mains (single phase)', model: 'LED2201G8', vendor: 'IKEA', description: 'TRADFRI bulb GU10, white spectrum, 345 lm', modelId: 'TRADFRI bulb GU10 WS 345lm', manufacturer: 'IKEA of Sweden', swBuild: '1.0.38', ota: true, profile: 'bulb_ws', lq: 172, ageMs: 2 * MIN }),
	device({ ieee: '0x00158d0004a1b204', nwk: 60311, name: 'Bedroom/Climate', model: 'WSDCGQ11LM', vendor: 'Aqara', description: 'Temperature and humidity sensor', modelId: 'lumi.weather', manufacturer: 'LUMI', swBuild: '3000-0001', dateCode: '20191205', profile: 'climate', lq: 87, ageMs: 12 * MIN }),
	device({ ieee: '0x00158d0004c2d305', nwk: 18890, name: 'Hallway/Front Door', model: 'MCCGQ11LM', vendor: 'Aqara', description: 'Door and window sensor', modelId: 'lumi.sensor_magnet.aq2', manufacturer: 'LUMI', dateCode: '20161128', desc: 'Main entrance', profile: 'contact', lq: 141, ageMs: 48 * MIN }),
	device({ ieee: '0x00158d0004e3f406', nwk: 33017, name: 'Hallway/Motion', model: 'RTCGQ11LM', vendor: 'Aqara', description: 'Motion sensor', modelId: 'lumi.sensor_motion.aq2', manufacturer: 'LUMI', dateCode: '20170627', profile: 'motion', lq: 63, ageMs: 3 * MIN }),
	device({ ieee: '0x00158d0005f4a507', nwk: 2741, name: 'Bathroom/Leak', model: 'SJCGQ11LM', vendor: 'Aqara', description: 'Water leak sensor', modelId: 'lumi.sensor_wleak.aq1', manufacturer: 'LUMI', profile: 'leak', lq: 0, ageMs: 2 * 24 * 60 * MIN, offline: true }),
	device({ ieee: '0x000b57fffe6b7c08', nwk: 47110, name: 'Bedroom/Switch', model: 'E1743', vendor: 'IKEA', description: 'TRADFRI ON/OFF switch', modelId: 'TRADFRI on/off switch', manufacturer: 'IKEA of Sweden', swBuild: '2.2.010', ota: true, profile: 'remote_onoff', lq: 110, ageMs: 4 * 60 * MIN }),
	device({ ieee: '0x000b57fffe7c8d09', nwk: 29004, name: 'Living Room/Remote', model: 'E1524/E1810', vendor: 'IKEA', description: 'TRADFRI remote control', modelId: 'TRADFRI remote control', manufacturer: 'IKEA of Sweden', swBuild: '2.3.014', ota: true, profile: 'remote_5btn', lq: 39, ageMs: 26 * 60 * MIN }),
	device({ ieee: '0x000b57fffe8d9e10', nwk: 51230, name: 'Office/Dimmer', model: 'E1603/E1702/E1708', vendor: 'IKEA', description: 'TRADFRI control outlet', type: 'Router', power: 'Mains (single phase)', modelId: 'TRADFRI control outlet', manufacturer: 'IKEA of Sweden', swBuild: '2.3.089', ota: true, profile: 'outlet', lq: 205, ageMs: 0.2 * MIN }),
	device({ ieee: '0x0017880109af0b11', nwk: 8812, name: 'Bedroom/Hue Dimmer', model: '324131092621', vendor: 'Philips', description: 'Hue dimmer switch', modelId: 'RWL021', manufacturer: 'Signify Netherlands B.V.', swBuild: '6.1.1.28573', ota: true, profile: 'hue_dimmer', lq: 152, ageMs: 7 * 60 * MIN }),
	device({ ieee: '0x00124b0022ab1c12', nwk: 14590, name: 'Office/Climate', model: 'SNZB-02', vendor: 'SONOFF', description: 'Temperature and humidity sensor', modelId: 'TH01', manufacturer: 'eWeLink', dateCode: '20201026', profile: 'climate_sonoff', lq: 98, ageMs: 9 * MIN }),
	device({ ieee: '0xa4c138bcd2e3f413', nwk: 61002, name: 'Office/Desk Plug', type: 'Router', power: 'Mains (single phase)', model: 'TS011F_plug_1', vendor: 'Tuya', description: 'Smart plug (with power monitoring)', modelId: 'TS011F', manufacturer: '_TZ3000_gjnozsaz', swBuild: '0122052017', profile: 'plug_power', lq: 184, ageMs: 0.1 * MIN }),
	device({ ieee: '0xa4c138cde3f4a514', nwk: 3390, name: 'Bedroom/Radiator', model: 'TS0601_thermostat', vendor: 'Tuya', description: 'Radiator valve with thermostat', modelId: 'TS0601', manufacturer: '_TZE200_ckud7u2l', disabled: true, desc: 'Disabled for the summer', profile: 'trv', lq: 76, ageMs: 40 * 24 * 60 * MIN }),
	// Native definition, but zigbee2mqtt.io has no image for it -> exercises fallback
	device({ ieee: '0x00124b0025de6f15', nwk: 7754, name: 'Garage/Light Switch', type: 'Router', power: 'Mains (single phase)', model: 'ZBMINI-L2', vendor: 'SONOFF', description: 'Zigbee smart switch (no neutral)', modelId: 'ZBMINIL2', manufacturer: 'SONOFF', profile: 'relay', lq: 132, ageMs: 1.5 * MIN }),
	// External converter with a custom icon served by Z2M (relative path)
	device({ ieee: '0x8c65a3fffe1f2a16', nwk: 22458, name: 'Garden/Soil Sensor', model: 'DIY-SOIL-01', vendor: 'Custom devices (DiY)', description: 'DIY capacitive soil moisture sensor', source: 'external', icon: 'device_icons/diy-soil.svg', modelId: 'DIY_SOIL', manufacturer: 'DIY', profile: 'diy_soil', lq: 54, ageMs: 18 * MIN }),
	// Unsupported device -> Z2M generates a definition
	device({ ieee: '0x54ef44100031b217', nwk: 39871, name: '0x54ef44100031b217', type: 'Router', power: 'Mains (single phase)', model: 'TS0002', vendor: 'Tuya', description: 'Automatically generated definition', source: 'generated', supported: false, modelId: 'TS0002', manufacturer: '_TZ3000_unknown', profile: 'generated', lq: 120, ageMs: 6 * MIN }),
	// Interview failed -> no definition
	device({ ieee: '0x0c4314fffe2a3b18', nwk: 12004, name: '0x0c4314fffe2a3b18', interview: 'FAILED', supported: false, power: undefined, ageMs: 3 * 60 * MIN })
];

/** bridge/devices payload (mock-only fields removed) */
export const devices = raw.map(({ _mock, ...d }) => d);

/** Mutable per-device state, keyed by friendly name */
export const states = Object.fromEntries(
	raw.filter((d) => d._mock).map((d) => [d.friendly_name, { ...d._mock.state, last_seen: new Date(Date.now() - d._mock.ageMs).toISOString() }])
);

/** Availability per friendly name (Z2M doesn't track disabled devices) */
export const availability = Object.fromEntries(
	raw.filter((d) => d._mock && !d.disabled).map((d) => [d.friendly_name, d._mock.offline ? 'offline' : 'online'])
);

export const bridgeInfo = {
	version: '2.6.3',
	commit: 'a1b2c3d',
	zigbee_herdsman: { version: '4.4.1' },
	zigbee_herdsman_converters: { version: '25.30.0' },
	coordinator: { ieee_address: '0x00124b0029aa1234', type: 'zStack3x0', meta: { revision: 20230507, transportrev: 2, product: 1, majorrel: 2, minorrel: 7, maintrel: 1 } },
	network: { channel: 15, pan_id: 6754, extended_pan_id: '0xdddddddddddddddd' },
	log_level: 'info',
	permit_join: false,
	permit_join_end: null,
	restart_required: false,
	config: {
		homeassistant: { enabled: true },
		mqtt: { base_topic: 'zigbee2mqtt', server: 'mqtt://mosquitto:1883' },
		serial: { port: '/dev/ttyUSB0', adapter: 'zstack' },
		frontend: { enabled: true, port: 8080 },
		availability: { enabled: true },
		advanced: { channel: 15, last_seen: 'ISO_8601', log_level: 'info' }
	},
	config_schema: {}
};

export const groups = [
	{ id: 1, friendly_name: 'Living Room Lights', members: [{ ieee_address: '0x000d6ffffe1a2b01', endpoint: 1 }, { ieee_address: '0x001788010b2c3d02', endpoint: 11 }], scenes: [] }
];
