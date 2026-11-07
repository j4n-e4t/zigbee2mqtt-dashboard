// Per-browser UI preferences (column visibility, sort), persisted in localStorage.
// Storage can be unavailable (private mode, blocked site data): everything still works in memory.

export const COLUMNS = [
	{ id: 'manufacturer', label: 'Manufacturer' },
	{ id: 'model', label: 'Model' },
	{ id: 'ieee', label: 'IEEE address' },
	{ id: 'type', label: 'Type' },
	{ id: 'lqi', label: 'Link quality' },
	{ id: 'battery', label: 'Battery' },
	{ id: 'lastSeen', label: 'Last seen' },
	{ id: 'availability', label: 'Availability' },
	{ id: 'firmware', label: 'Firmware' },
	{ id: 'status', label: 'Status' }
] as const;
export type ColumnId = (typeof COLUMNS)[number]['id'];
export type SortKey = 'name' | 'manufacturer' | 'model' | 'ieee' | 'type' | 'lqi' | 'battery' | 'lastSeen' | 'availability';

type Prefs = {
	hidden: ColumnId[];
	sortKey: SortKey;
	sortDir: 'asc' | 'desc';
};

const KEY = 'z2m-dashboard:prefs:v1';
const defaults: Prefs = { hidden: ['firmware'], sortKey: 'name', sortDir: 'asc' };

function load(): Prefs {
	try {
		const raw = localStorage.getItem(KEY);
		if (raw) return { ...defaults, ...JSON.parse(raw) };
	} catch {
		// ignore
	}
	return { ...defaults };
}

export const prefs = $state<Prefs>(load());

export function savePrefs() {
	try {
		localStorage.setItem(KEY, JSON.stringify(prefs));
	} catch {
		// ignore
	}
}

export function resetPrefs() {
	Object.assign(prefs, structuredClone(defaults));
	savePrefs();
}

export const isVisible = (id: ColumnId) => !prefs.hidden.includes(id);

export function setVisible(id: ColumnId, visible: boolean) {
	prefs.hidden = visible ? prefs.hidden.filter((c) => c !== id) : [...prefs.hidden, id];
	savePrefs();
}

export function sortBy(key: SortKey) {
	if (prefs.sortKey === key) prefs.sortDir = prefs.sortDir === 'asc' ? 'desc' : 'asc';
	else {
		prefs.sortKey = key;
		prefs.sortDir = 'asc';
	}
	savePrefs();
}
