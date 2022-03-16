import fs from "fs";
import { extname, join } from "path";
import fsPromises from "fs/promises";
import { randomUUID } from "crypto";
import { PassThrough, Writable } from "stream";
import { exec, spawn } from "child_process";
import { logger } from "../utils/log.util.js";
import Throttle from "throttle";
import StreamPromises from "stream/promises";
import { once } from "events";
import { promisify } from "util";

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
		const id = randomUUID();
		const clientStream = new PassThrough();

		this.clientStreams.set(id, clientStream);

		return {
			id,
			clientStream,
		};
	}

	removeClientStream(id) {
		this.clientStreams.delete(id);
	}

	async _executeSoxCommand(args) {
		return new Promise((resolve, reject) => {
			exec("sox ".concat(args.join(" ")), (error, out, stderror) => {
				if (error) reject(error);
				if (stderror) reject(stderror);

				resolve(out.toString());
			});
		});
	}

	async getBitRate(song) {
		try {
			const args = ["--i", "-B", song];

			const result = await this._executeSoxCommand(args);

			return result.toString().trim().replace(/k/, "000");
		} catch (error) {
			logger.error(
				`Could not get Bitrate song [${song}] file given error: [${error}]`
			);
			return this.config.constants.fallbackBitRate;
		}
	}

	broadCast() {
		return new Writable({
			write: (chunk, encoding, callback) => {
				for (const [id, stream] of this.clientStreams) {
					if (stream.writableEnded) {
						this.clientStreams.delete(id);
						continue;
					}

					stream.write(chunk);
				}

				callback();
			},
		});
	}

	async startStreaming() {
		logger.info(`Starting with ${this.currentSong}`);

		const bitRate = (this.currentBitRate =
			(await this.getBitRate(this.currentSong)) /
			this.config.constants.bitRateDivisor);

		const throttleTransform = (this.throttleTransform = new Throttle(
			bitRate
		));

		const songReadable = (this.songReadable = this.createFileStream(
			this.currentSong
		));

		return StreamPromises.pipeline(
			songReadable,
			throttleTransform,
			this.broadCast()
		);
	}

	async stopStreaming() {
		this.throttleTransform?.end?.();
	}

	createFileStream(filename) {
		return fs.createReadStream(filename);
	}

	async getFileInfo(filename) {
		const fullFilePath = join(this.config.dir.publicDirectory, filename);

		// Valida se existe, caso não, um erro é gerado.
		await fsPromises.access(fullFilePath);

		const fileType = extname(fullFilePath);

		return {
			type: fileType,
			name: fullFilePath,
		};
	}

	async getFileStream(filename) {
		const { type, name } = await this.getFileInfo(filename);

		return {
			stream: this.createFileStream(name),
			type,
		};
	}
}
