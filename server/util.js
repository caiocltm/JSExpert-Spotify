import pino from "pino";
import config from "./config.js";

const log = pino({
	enabled: config.logEnabled,
	transport: {
		target: "pino-pretty",
		options: {
			colorize: true,
		},
	},
});

export const logger = log;
