import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import { RoutesController } from '../../../server/controllers/routes.controller.js';
import { RoutesService } from '../../../server/services/routes.service.js';
import TestUtil from '../../_util/test.util.js';
import config from '../../../server/config/config.js';

const {
	pages: { homeHTML }
} = config;

describe('#Routes Controller - Test suite for API response', () => {
	let routesController;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();

		routesController = new RoutesController(config);
	});

	describe('getFileStream', () => {
		test('should successfully response with file stream', async () => {
			const mockFileStream = TestUtil.generateReadableStream(['data']);

			const expected = { stream: mockFileStream, type: '.html' };

			const getFileStreamMock = jest
				.spyOn(RoutesService.prototype, RoutesService.prototype.getFileStream.name)
				.mockResolvedValue(expected);

			expect(await routesController.getFileStream(homeHTML)).toStrictEqual(expected);
			expect(getFileStreamMock).toHaveBeenCalledWith(homeHTML);
		});
	});

	describe('handleCommand', () => {
		test('should successfully start stream', async () => {
			const command = 'start';
			const expected = {
				result: 'ok'
			};

			const startStreamingMock = jest.spyOn(RoutesService.prototype, RoutesService.prototype.startStreaming.name).mockReturnValue();

			expect(await routesController.handleCommand({ command })).toStrictEqual(expected);
			expect(startStreamingMock).toHaveBeenCalled();
		});

		test('should successfully stop stream', async () => {
			const command = 'stop';
			const expected = {
				result: 'ok'
			};

			const stopStreamingMock = jest.spyOn(RoutesService.prototype, RoutesService.prototype.stopStreaming.name).mockReturnValue();

			expect(await routesController.handleCommand({ command })).toStrictEqual(expected);
			expect(stopStreamingMock).toHaveBeenCalled();
		});

		test('should not execute command given unknown operation and return result', async () => {
			const command = 'pause';
			const expected = {
				result: 'ok'
			};

			expect(await routesController.handleCommand({ command })).toStrictEqual(expected);
		});
	});

	describe('createClientStream', () => {
		test('should successfully create client stream', async () => {
			const mockStream = TestUtil.generateReadableStream(['test']);
			const mockId = '1';
			jest.spyOn(RoutesService.prototype, RoutesService.prototype.createClientStream.name).mockReturnValue({
				id: mockId,
				clientStream: mockStream
			});

			jest.spyOn(RoutesService.prototype, RoutesService.prototype.removeClientStream.name).mockReturnValue();

			const { stream, onClose } = routesController.createClientStream();

			onClose();

			expect(stream).toStrictEqual(mockStream);
			expect(RoutesService.prototype.removeClientStream).toHaveBeenCalledWith(mockId);
			expect(RoutesService.prototype.createClientStream).toHaveBeenCalled();
		});
	});
});
