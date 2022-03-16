import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import { RoutesController } from "../../../server/controllers/routes.controller.js";
import { RoutesService } from "../../../server/services/routes.service.js";
import TestUtil from "../../_util/test.util.js";
import config from "../../../server/config/config.js";

const {
	pages: { homeHTML },
} = config;

describe("#Routes Controller - Test suite for API response", () => {
	let routesController;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();

		routesController = new RoutesController(config);
	});

	describe("getFileStream", () => {
		test("should successfully response with file stream", async () => {
			const mockFileStream = TestUtil.generateReadableStream(["data"]);

			const expected = { stream: mockFileStream, type: ".html" };

			const getFileStreamMock = jest
				.spyOn(
					RoutesService.prototype,
					RoutesService.prototype.getFileStream.name
				)
				.mockResolvedValue(expected);

			expect(
				await routesController.getFileStream(homeHTML)
			).toStrictEqual(expected);
			expect(getFileStreamMock).toHaveBeenCalledWith(homeHTML);
		});
	});
});
