import fs from "fs";
import { extname, join } from "path";
import config from "./config.js";
import fsPromises from "fs/promises";

const {
	dir: { publicDirectory },
} = config;

export class Service {
	createFileStream(filename) {
		return fs.createReadStream(filename);
	}

	async getFileInfo(filename) {
		const fullFilePath = join(publicDirectory, filename);

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
