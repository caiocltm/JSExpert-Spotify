import fs from "fs";
import { extname, join } from "path";
import fsPromises from "fs/promises";

export class RoutesService {
	constructor(config) {
		this.config = config;
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
