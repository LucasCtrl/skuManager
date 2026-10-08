import type { ElectrobunConfig } from "electrobun";
import { APP_VERSION } from "./src/shared/version";

export default {
	app: {
		name: "SKU Manager",
		identifier: "com.elsasskabel.skumanager",
		version: APP_VERSION,
	},
	build: {
		mainProcess: "cottontail",
		cottontail: {
			entrypoint: "src/bun/index.ts",
		},
		// Vite builds to dist/, we copy from there
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
		},
		watchIgnore: ["dist/**"],
		mac: { bundleCEF: false },
		linux: { bundleCEF: false },
		win: { bundleCEF: false },
	},
} satisfies ElectrobunConfig;
