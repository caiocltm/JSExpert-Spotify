import { RoutesService } from "../services/routes.service.js";
import { logger } from "../utils/log.util.js";

export class RoutesController {
	constructor(config) {
		this.config = config;
		this.routesService = new RoutesService(this.config);
	}

	async getFileStream(filename) {
		return this.routesService.getFileStream(filename);
	}

	async handleCommand({ command }) {
		logger.info(`Command received: [${command}]`);

		const result = {
			result: "ok",
		};

		const cmd = command.toLowerCase();

		if (cmd.includes("start")) {
			this.routesService.startStreaming();
			return result;
		}

		if (cmd.includes("stop")) {
			this.routesService.stopStreaming();
			return result;
		}
	}

	createClientStream() {
		const { id, clientStream } = this.routesService.createClientStream();

		/* istanbul ignore next */
		const onClose = () => {
			logger.info(`Closing connection of client [${id}]`);
			this.routesService.removeClientStream(id);
		};

		return {
			stream: clientStream,
			onClose,
		};
	}
}
