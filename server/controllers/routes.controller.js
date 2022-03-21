import { RoutesService } from '../services/routes.service.js';
import { logger } from '../utils/log.util.js';

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
			result: 'ok'
		};

		const cmd = command.toLowerCase();

		if (!(cmd in this.config.commands)) return result;

		const availableCommands = {
			[this.config.commands.start]: () => {
				this.routesService.startStreaming();
				return result;
			},

			[this.config.commands.stop]: () => {
				this.routesService.stopStreaming();
				return result;
			},

			[this.config.commands.applause]: async () => {
				const chosenFxAudio = await this.routesService.readFxByName(this.config.commands.applause);

				this.routesService.appendFxAudioStream(chosenFxAudio);

				logger.info(`Added Fx audio ${chosenFxAudio} to service`);

				return result;
			},

			[this.config.commands.audience_applause]: async () => {
				const chosenFxAudio = await this.routesService.readFxByName(this.config.commands.audience_applause);

				this.routesService.appendFxAudioStream(chosenFxAudio);

				logger.info(`Added Fx audio ${chosenFxAudio} to service`);

				return result;
			},

			[this.config.commands.boo]: async () => {
				const chosenFxAudio = await this.routesService.readFxByName(this.config.commands.boo);

				this.routesService.appendFxAudioStream(chosenFxAudio);

				logger.info(`Added Fx audio ${chosenFxAudio} to service`);

				return result;
			},

			[this.config.commands.fart]: async () => {
				const chosenFxAudio = await this.routesService.readFxByName(this.config.commands.fart);

				this.routesService.appendFxAudioStream(chosenFxAudio);

				logger.info(`Added Fx audio ${chosenFxAudio} to service`);

				return result;
			},

			[this.config.commands.laughing]: async () => {
				const chosenFxAudio = await this.routesService.readFxByName(this.config.commands.laughing);

				this.routesService.appendFxAudioStream(chosenFxAudio);

				logger.info(`Added Fx audio ${chosenFxAudio} to service`);

				return result;
			}
		};

		return availableCommands[cmd]();
	}

	createClientStream() {
		const { id, clientStream } = this.routesService.createClientStream();

		const onClose = () => {
			logger.info(`Closing connection of client [${id}]`);
			this.routesService.removeClientStream(id);
		};

		return {
			stream: clientStream,
			onClose
		};
	}
}
