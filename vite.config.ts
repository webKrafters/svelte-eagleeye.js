import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [ sveltekit() ],
	test: {
		coverage: {
			include: [
				'src/**/*.{ts,tsx,js,jsx}'
			],
			exclude: [
				'src/app.d.ts',
				'src/lib/index.ts',
				'src/lib/test-artifacts',
				'src/lib/vitest-examples'
			],
			provider: 'v8', // or 'istanbul'
			reporter: [ 'text', 'json', 'html', 'lcov' ],
			reportOnFailure: true, 
			reportsDirectory: './coverage' // Adjust to your source directory
		},
		include: [ 'src/**/*.{test,spec}.{js,ts}' ],
		projects: [{
			extends: './vite.config.ts',
			test: {
				name: 'client',
				browser: {
					enabled: true,
					provider: playwright(),
					instances: [{
						browser: 'chromium',
						headless: true
					}]
				},
				include: [ 'src/**/*.svelte.{test,spec}.{js,ts}' ],
				exclude: [ 'src/lib/server/**' ]
			}
		}, {
			extends: './vite.config.ts',
			test: {
				name: 'server',
				environment: 'node',
				include: [ 'src/**/*.{test,spec}.{js,ts}' ],
				exclude: [ 'src/**/*.svelte.{test,spec}.{js,ts}' ]
			}
		}]
	}
});
