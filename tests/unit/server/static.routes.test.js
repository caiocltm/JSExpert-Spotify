import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import config from '../../../server/config/config.js';
import { RoutesController } from '../../../server/controllers/routes.controller.js';
import { staticRoutes } from '../../../server/routes/static.routes.js';
import TestUtil from '../../_util/test.util.js';
import Events from 'events';

const {
	pages: { homeHTML, controllerHTML },
	location: { home },
	constants: { CONTENT_TYPE }
} = config;

describe('#Static Routes - Test suite for API response', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe('Static Routes', () => {
		test('GET / - should redirect to home page', async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'GET';
			params.request.url = '/';

			await staticRoutes(...params.values());

			expect(params.response.end).toHaveBeenCalled();
			expect(params.response.writeHead).toBeCalledWith(302, {
				Location: home
			});
		});

		test(`GET /home - should response with ${homeHTML} file stream`, async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'GET';
			params.request.url = '/home';

			const mockFileStream = TestUtil.generateReadableStream(['data']);

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.getFileStream.name).mockResolvedValue({
				stream: mockFileStream,
				type: '.txt'
			});
			jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

			await staticRoutes(...params.values());

			expect(RoutesController.prototype.getFileStream).toBeCalledWith(homeHTML);
			expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
		});

		test(`GET /controller - should response with ${controllerHTML} file stream`, async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'GET';
			params.request.url = '/controller';

			const mockFileStream = TestUtil.generateReadableStream(['data']);

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.getFileStream.name).mockResolvedValue({
				stream: mockFileStream,
				type: '.txt'
			});
			jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

			await staticRoutes(...params.values());

			expect(RoutesController.prototype.getFileStream).toBeCalledWith(controllerHTML);
			expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
		});

		test('GET /file.ext - should response with file stream', async () => {
			const params = TestUtil.defaultHandlerParams();
			const filename = '/index.html';

			params.request.method = 'GET';
			params.request.url = filename;

			const mockFileStream = TestUtil.generateReadableStream(['data']);

			const expectedType = '.html';

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.getFileStream.name).mockResolvedValue({
				stream: mockFileStream,
				type: expectedType
			});
			jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

			await staticRoutes(...params.values());

			expect(RoutesController.prototype.getFileStream).toBeCalledWith(filename);
			expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
			expect(params.response.writeHead).toBeCalledWith(200, {
				'Content-Type': CONTENT_TYPE[expectedType]
			});
		});

		test('GET /photo.png - should response with file stream', async () => {
			const params = TestUtil.defaultHandlerParams();
			const filename = '/photo.png';

			params.request.method = 'GET';
			params.request.url = filename;

			const mockFileStream = TestUtil.generateReadableStream(['data']);

			const expectedType = '';

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.getFileStream.name).mockResolvedValue({
				stream: mockFileStream,
				type: expectedType
			});
			jest.spyOn(mockFileStream, 'pipe').mockReturnValue();

			await staticRoutes(...params.values());

			expect(RoutesController.prototype.getFileStream).toBeCalledWith(filename);
			expect(mockFileStream.pipe).toHaveBeenCalledWith(params.response);
		});

		test('GET /stream - should response with audio stream', async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'GET';
			params.request.url = '/stream?id=999999';

			const clienteStreamMock = TestUtil.generatePassthroughStream();

			const onClose = jest.fn();

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.createClientStream.name).mockReturnValue({
				stream: clienteStreamMock,
				onClose
			});

			jest.spyOn(clienteStreamMock, 'pipe').mockReturnValue();

			await staticRoutes(...params.values());

			expect(RoutesController.prototype.createClientStream).toHaveBeenCalled();
			expect(clienteStreamMock.pipe).toHaveBeenCalledWith(params.response);
			expect(params.response.writeHead).toHaveBeenCalledWith(200, {
				'Content-Type': 'audio/mpeg',
				'Accept-Ranges': 'bytes'
			});
		});

		test('POST /controller - should response result object', async () => {
			const command = '{ "command": "start" }';
			const params = TestUtil.defaultHandlerParams(command);
			const result = { result: 'ok' };

			params.request.method = 'POST';
			params.request.url = '/controller';

			jest.spyOn(Events, 'once').mockResolvedValue(command);

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.handleCommand.name).mockResolvedValue(result);

			await staticRoutes(...params.values());

			expect(RoutesController.prototype.handleCommand).toHaveBeenCalled();
			expect(params.response.end).toHaveBeenCalledWith(JSON.stringify(result));
		});

		test('GET /unknown - should response with 404 (Not found) given an inexistent route', async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'POST';
			params.request.url = '/unknown';

			await staticRoutes(...params.values());

			expect(params.response.writeHead).toHaveBeenCalledWith(404);
			expect(params.response.end).toHaveBeenCalled();
		});
	});

	describe('Exceptions', () => {
		test('should response with 404 (Not found) given inexistent file', async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'GET';
			params.request.url = '/index.png';

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.getFileStream.name).mockRejectedValue(
				new Error('Error: ENOENT: no such file or directory')
			);

			await staticRoutes(...params.values());

			expect(params.response.writeHead).toHaveBeenCalledWith(404);
			expect(params.response.end).toHaveBeenCalled();
		});

		test('should response with 500 (Internal server error) given an unknown error', async () => {
			const params = TestUtil.defaultHandlerParams();

			params.request.method = 'GET';
			params.request.url = '/index.png';

			jest.spyOn(RoutesController.prototype, RoutesController.prototype.getFileStream.name).mockRejectedValue(
				new Error('Error: unknown')
			);

			await staticRoutes(...params.values());

			expect(params.response.writeHead).toHaveBeenCalledWith(500);
			expect(params.response.end).toHaveBeenCalled();
		});
	});
});
