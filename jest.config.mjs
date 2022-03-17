const defaultConfig = {
	coverageDirectory: "coverage",
	coverageProvider: "v8",
	coverageReporters: ["text", "lcov"],
	coverageThreshold: {
		global: {
			branch: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
	coveragePathIgnorePatterns: ["tests/_util/test.util.js"],
	maxWorkers: "50%",
	watchPathIgnorePatterns: ["node_modules"],
	transformIgnorePatterns: ["node_modules"],
};

export default {
	projects: [
		{
			...defaultConfig,
			testEnvironment: "node",
			displayName: {
				name: 'Unit Tests Server',
				color: 'blue'
			},
			collectCoverageFrom: ["server/", "!server/index.js"],
			transformIgnorePatterns: [
				...defaultConfig.transformIgnorePatterns,
				"public",
			],
			testMatch: ["**/tests/unit/server/**/*.test.js"],
		},
		{
			...defaultConfig,
			testEnvironment: "node",
			displayName: {
				name: 'e2e Tests Server',
				color: 'white'
			},
			collectCoverageFrom: ["server/", "!server/index.js"],
			transformIgnorePatterns: [
				...defaultConfig.transformIgnorePatterns,
				"public",
			],
			testMatch: ["**/tests/e2e/server/**/*.test.js"],
		},
		{
			...defaultConfig,
			testEnvironment: "jsdom",
			displayName: {
				name: 'Unit Tests App',
				color: 'green'
			},
			collectCoverageFrom: ["public/"],
			transformIgnorePatterns: [
				...defaultConfig.transformIgnorePatterns,
				"server",
			],
			testMatch: ["**/tests/unit/public/**/*.test.js"],
		},
		{
			...defaultConfig,
			testEnvironment: "jsdom",
			displayName: {
				name: 'e2e Tests App',
				color: 'red'
			},
			collectCoverageFrom: ["public/"],
			transformIgnorePatterns: [
				...defaultConfig.transformIgnorePatterns,
				"server",
			],
			testMatch: ["**/tests/e2e/public/**/*.test.js"],
		},
	],
};
