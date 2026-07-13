import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';


export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			preprocess: vitePreprocess(),
			adapter: adapter()
		})
	],
	test: {
		coverage: {
			include: [
				'src/lib/index.{svelte}.{test,spec}.{js,ts}',
				'src/lib/main/**/*.svelte.{test,spec}.{js,ts}',

				'src/**/*.{ts,tsx,js,jsx}'
			],
			exclude: [
				'src/app.d.ts',
				'src/lib/index.ts',
				'src/lib/test-artifacts',
				'src/lib/vitest-examples'
			],
			provider: 'v8', // or 'istanbul'
			reporter: ['text', 'json', 'html', 'lcov'],
			reportOnFailure: true, 
			reportsDirectory: './coverage' // Adjust to your source directory
		},
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
