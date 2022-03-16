import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { Controller } from "../../../server/controller.js";
import { Service } from "../../../server/service.js";
import TestUtil from "../../_util/testUtil.js";
import config from "../../../server/config.js";

const {
	pages: { homeHTML }
} = config;

describe("#Controller - Test suite for API response", () => {
	let controller;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();

		controller = new Controller();
	});

	describe("getFileStream", () => {
		test("should successfully response with file stream", async () => {
			const mockFileStream = TestUtil.generateReadableStream(["data"]);

			const expected = { stream: mockFileStream, type: ".html" };

			const getFileStreamMock = jest.spyOn(
				Service.prototype,
				Service.prototype.getFileStream.name
			).mockResolvedValue(expected);

			expect(await controller.getFileStream(homeHTML)).toStrictEqual(
				expected
			);
			expect(getFileStreamMock).toHaveBeenCalledWith(homeHTML);
		});
	});
});
