import fs from 'fs';
import { extname, join } from 'path';
import fsPromises from 'fs/promises';
import crypto from 'crypto';
import { PassThrough, Writable } from 'stream';
import ChildProcess from 'child_process';
import { logger } from '../utils/log.util.js';
import Throttle from 'throttle';
import StreamPromises from 'stream/promises';
import { once } from 'events';

export class RoutesService {
	constructor(config) {
		this.clientStreams = new Map();
		this.config = config;
		this.currentSong = this.config.constants.englishConversation;
		this.currentBitRate = 0;
		this.songReadable = {};
		this.throttleTransform = {};
	}

	createClientStream() {
		const id = crypto.randomUUID();
		const clientStream = new PassThrough();

		this.clientStreams.set(id, clientStream);

		return {
			id,
			clientStream
		};
	}

	removeClientStream(id) {
		this.clientStreams.delete(id);
	}

	_executeSoxCommand(args) {
		return ChildProcess.spawn('sox', args);
	}

	async getBitRate(song) {
		try {
			const args = [
				'--i', // info
				'-B', // bitrate
				song
			];
			const { stderr, stdout } = this._executeSoxCommand(args);

			await Promise.all([once(stderr, 'readable'), once(stdout, 'readable')]);

			const [success, error] = [stdout, stderr].map((stream) => stream.read());

			if (error) return await Promise.reject(error);

			return success.toString().trim().replace(/k/, '000');
		} catch (error) {
			logger.error(`Could not get Bitrate song [${song}] file given error: [${error}]`);

			return this.config.constants.fallbackBitRate;
		}
	}

	broadCast() {
		return new Writable({
			write: (chunk, encoding, callback) => {
				for (const [id, stream] of this.clientStreams) {
					if (stream.writableEnded) {
						this.clientStreams.delete(id);
						// eslint-disable-next-line no-continue
						continue;
					}

					stream.write(chunk);
				}

				callback();
			}
		});
	}

	async startStreaming() {
		logger.info(`Starting with ${this.currentSong}`);

		this.currentBitRate = (await this.getBitRate(this.currentSong)) / this.config.constants.bitRateDivisor;

		this.throttleTransform = new Throttle(this.currentBitRate);

		this.songReadable = this.createFileStream(this.currentSong);

		return StreamPromises.pipeline(this.songReadable, this.throttleTransform, this.broadCast());
	}

	stopStreaming() {
		this.throttleTransform?.end?.();
	}

	createFileStream(filename) {
		return fs.createReadStream(filename);
	}

	async getFileInfo(filename) {
		const fullFilePath = join(this.config.dir.publicDirectory, filename);

		await fsPromises.access(fullFilePath);

		const fileType = extname(fullFilePath);

		return {
			type: fileType,
			name: fullFilePath
		};
	}

	async getFileStream(filename) {
		const { type, name } = await this.getFileInfo(filename);

		return {
			stream: this.createFileStream(name),
			type
		};
	}

	async readFxByName(fxName) {
		const fxAudios = await fsPromises.readdir(this.config.dir.fxDirectory);
		const chosenFxAudio = fxAudios.find((filename) => filename.toLowerCase().includes(fxName));

		if (!chosenFxAudio) return Promise.reject(new Error(`Fx audio ${fxName} was not found`));

		return join(this.config.dir.fxDirectory, chosenFxAudio);
	}

	appendFxAudioStream(fxAudio) {
		const throttleTransformable = new Throttle(this.currentBitRate);

		StreamPromises.pipeline(throttleTransformable, this.broadCast());

		const unpipe = () => {
			const transformStream = this.mergeAudioStreams(fxAudio, this.songReadable);

			this.throttleTransform = throttleTransformable;

			this.songReadable = transformStream;

			this.songReadable.removeListener('unpipe', unpipe);

			StreamPromises.pipeline(transformStream, throttleTransformable);
		};

		this.throttleTransform.on('unpipe', unpipe);

		this.throttleTransform.pause();

		this.songReadable.unpipe(this.throttleTransform);
	}

	mergeAudioStreams(song, readable) {
		const transformStream = new PassThrough();
		const args = [
			'-t',
			this.config.constants.audioMediaType,
			'-v',
			this.config.constants.songVolume,
			'-m',
			'-',
			'-t',
			this.config.constants.audioMediaType,
			'-v',
			this.config.constants.fxVolume,
			song,
			'-t',
			this.config.constants.audioMediaType,
			'-'
		];

		const { stdin, stdout } = this._executeSoxCommand(args);

		StreamPromises.pipeline(readable, stdin).catch((error) => logger.error(`Could not send stream to sox: [${error}]`));

		StreamPromises.pipeline(stdout, transformStream).catch((error) => logger.error(`Could not receive stream to sox: [${error}]`));

		return transformStream;
	}
}
