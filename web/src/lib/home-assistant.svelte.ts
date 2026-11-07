// Home Assistant look & feel integration (ported from ha-editor's lib/home-assistant.ts).
//
// Standalone: follows the system dark mode and HA's 870px "narrow" breakpoint.
// Embedded in Home Assistant on the same origin (ingress / panel_iframe behind the same proxy):
// copies the live theme variables from the parent document, so custom themes and the user's
// dark-mode choice apply here too, and uses HA's ha-panel-app postMessage protocol for `narrow`.

const THEME_VARIABLES = [
	'primary-color', 'accent-color', 'primary-text-color', 'secondary-text-color', 'disabled-text-color',
	'text-primary-color', 'primary-background-color', 'secondary-background-color', 'card-background-color',
	'divider-color', 'outline-color', 'error-color', 'warning-color', 'success-color', 'info-color',
	'rgb-primary-color', 'rgb-primary-text-color',
	'sidebar-background-color', 'sidebar-text-color', 'sidebar-icon-color',
	'app-header-background-color', 'app-header-text-color', 'app-header-border-bottom', 'header-height',
	'data-table-background-color', 'ha-font-family-body', 'scrollbar-thumb-color'
];
const NARROW_QUERY = '(max-width: 870px)'; // Home Assistant's own narrow breakpoint

export const ha = $state({ embedded: false, narrow: false, dark: false });

function parentDocument(): Document | null {
	try {
		return window.parent !== window ? window.parent.document : null;
	} catch {
		return null; // cross-origin parent: not Home Assistant
	}
}

const luminance = (color: string) => {
	const m = color.match(/\d+(\.\d+)?/g);
	if (!m || m.length < 3) return 1;
	const [r, g, b] = m.slice(0, 3).map((n) => Number(n) / 255);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Resolved background color of <html>'s --primary-background-color, as rgb() */
function backgroundRgb() {
	const probe = document.createElement('div');
	probe.style.cssText = 'position:absolute;visibility:hidden;background:var(--primary-background-color)';
	document.body.append(probe);
	const color = getComputedStyle(probe).backgroundColor;
	probe.remove();
	return color;
}

const system = matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
	const root = document.documentElement;
	const parent = parentDocument();
	if (parent) {
		const computed = getComputedStyle(parent.documentElement);
		for (const name of THEME_VARIABLES) {
			const value = computed.getPropertyValue(`--${name}`).trim();
			if (value) root.style.setProperty(`--${name}`, value);
			else root.style.removeProperty(`--${name}`);
		}
	}
	// Inside Home Assistant the theme's background decides; standalone follows the system.
	const dark = parent ? luminance(backgroundRgb()) < 0.5 : system.matches;
	root.dataset.theme = dark ? 'dark' : 'light';
	root.style.colorScheme = dark ? 'dark' : 'light';
	ha.dark = dark;
}

export function connectHomeAssistant() {
	const parent = parentDocument();
	let frame = 0;
	const schedule = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(applyTheme);
	};
	applyTheme();
	system.addEventListener('change', schedule);

	if (!parent) {
		const narrow = matchMedia(NARROW_QUERY);
		ha.narrow = narrow.matches;
		narrow.addEventListener('change', () => (ha.narrow = narrow.matches));
		return;
	}

	ha.embedded = true;
	// HA applies themes as inline styles on <html> and as <style> elements in <head>
	const observer = new MutationObserver(schedule);
	observer.observe(parent.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
	observer.observe(parent.head, { childList: true, subtree: true, characterData: true });
	window.parent.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', schedule);

	window.addEventListener('message', (event) => {
		if (event.source !== window.parent || event.data?.type !== 'home-assistant/properties') return;
		ha.narrow = !!event.data.narrow;
	});
	window.parent.postMessage({ type: 'home-assistant/subscribe-properties' }, location.origin);
	window.addEventListener('pagehide', () =>
		window.parent.postMessage({ type: 'home-assistant/unsubscribe-properties' }, location.origin)
	);
}
