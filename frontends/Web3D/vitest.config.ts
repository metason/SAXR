import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		globals: false,
	},
	resolve: {
		// Order matters: more-specific aliases must come before prefix aliases.
		alias: [
			// Stub the shape registry — avoids importing React/R3F components
			{
				find: '@/components/shapes/registry',
				replacement: path.resolve(__dirname, 'src/__mocks__/registry.ts'),
			},
			// Stub all three.js imports — avoids browser/WebGL context requirement
			{
				find: /^three(\/.*)?$/,
				replacement: path.resolve(__dirname, 'src/__mocks__/three.ts'),
			},
			// Generic @ → src alias (must come last)
			{
				find: '@',
				replacement: path.resolve(__dirname, './src'),
			},
		],
	},
});
