import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { RoutesService } from "../../../server/services/routes.service.js";
import TestUtil from "../../_util/test.util.js";
import fs from "fs";
import path from "path";
import fsPromises from "fs/promises";
import config from "../../../server/config/config.js";

const {
	dir: { publicDirectory },
} = config;

describe("#Routes Service - Test suite for API response", () => {
	let routesService;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();

		routesService = new RoutesService(config);
	});

	describe("createFileStream", () => {
		test("should successfully response file read stream", async () => {
			const filename = "/home/index.html";

			const mockFileStream = TestUtil.generateReadableStream(["data"]);

			jest.spyOn(fs, "createReadStream").mockReturnValue(mockFileStream);

			expect(
				await routesService.createFileStream(filename)
			).toStrictEqual(mockFileStream);
		});
	});

	describe("getFileInfo", () => {
		test("should successfully response an object containing file name and type", async () => {
			const filename = "/home/index.html";
			const type = ".html";
			const expectedFullPath = path.join(publicDirectory, filename);

			jest.spyOn(fsPromises, "access").mockResolvedValue();
			jest.spyOn(path, "extname").mockReturnValue(type);

			const expected = {
				name: expectedFullPath,
				type: type,
			};

			expect(await routesService.getFileInfo(filename)).toStrictEqual(
				expected
			);
		});
	});

	describe("getFileStream", () => {
		test("should successfully response an object containing file stream and type", async () => {
			const filename = "/home/index.html";

			const mockFileStream = TestUtil.generateReadableStream(["data"]);

			const expectedFileInfo = { name: filename, type: ".html" };
			const expected = {
				stream: mockFileStream,
				type: expectedFileInfo.type,
			};

			jest.spyOn(
				RoutesService.prototype,
				RoutesService.prototype.getFileInfo.name
			).mockReturnValue(expectedFileInfo);
			jest.spyOn(
				RoutesService.prototype,
				RoutesService.prototype.createFileStream.name
			).mockReturnValue(mockFileStream);

			expect(await routesService.getFileStream(filename)).toStrictEqual(
				expected
			);
		});
	});
});
