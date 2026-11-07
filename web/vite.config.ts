import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA: with the hash router everything is served from index.html, no server rewrites needed
			adapter: adapter(),
			// Hash routing (#/device/...) works under any sub-path (reverse proxy, HA ingress) without server rewrites
			router: { type: 'hash' }
		})
	]
});
