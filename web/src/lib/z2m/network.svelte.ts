export type MapNode = {
 ieeeAddr: string;
 friendlyName: string;
 type: string;
 networkAddress: number;
 failed?: string[];
};
export type MapLink = {
 source: { ieeeAddr: string; networkAddress?: number };
 target: { ieeeAddr: string; networkAddress?: number };
 lqi?: number;
 linkquality?: number;
 routes?: unknown[];
};
export type NetworkMap = { nodes: MapNode[]; links: MapLink[] };

// Keep the last scan when switching tabs. An empty map is distinct from no scan yet.
export const network = $state<{
 map: NetworkMap | null;
 scannedAt: number | null;
 scanning: boolean;
 error: string | null;
}>({ map: null, scannedAt: null, scanning: false, error: null });
