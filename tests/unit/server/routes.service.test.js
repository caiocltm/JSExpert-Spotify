import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import { RoutesService } from '../../../server/services/routes.service.js';
import TestUtil from '../../_util/test.util.js';
import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import config from '../../../server/config/config.js';
import crypto from 'crypto';
import ChildProcess from 'child_process';
import EventEmitter from 'events';
import { Readable, Writable } from 'stream';
import StreamPromises from 'stream/promises';
import streamsAsync from 'stream/promises';

const {
	dir: { publicDirectory }
} = config;

describe('#Routes Service - Test suite for API response', () => {
	let routesService;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.restoreAllMocks();

		routesService = new RoutesService(config);
	});

	describe('createFileStream', () => {
		test('should successfully response file read stream', async () => {
			const filename = '/home/index.html';

			const mockFileStream = TestUtil.generateReadableStream(['data']);

			jest.spyOn(fs, 'createReadStream').mockReturnValue(mockFileStream);

			expect(await routesService.createFileStream(filename)).toStrictEqual(mockFileStream);
		});
	});

	describe('createClientStream', () => {
		test('should successfully create client stream', async () => {
			const id = 'a1b2c3d4e5f6g7h8i9j';

			const randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue(id);

			expect(routesService.createClientStream()).toHaveProperty('id');
			expect(routesService.createClientStream()).toHaveProperty('clientStream');
			expect(randomUUIDSpy).toHaveBeenCalled();
		});
	});

	describe('removeClientStream', () => {
		test('should successfully remove client stream given client id', async () => {
			const id = 'a1b2c3d4e5f6g7h8i9j';

			const clientStreamDeleteSpy = jest.spyOn(routesService.clientStreams, 'delete');

			expect(routesService.removeClientStream(id)).toBeUndefined();
			expect(clientStreamDeleteSpy).toHaveBeenCalledWith(id);
		});
	});

	describe('_executeSoxCommand', () => {
		test('should successfully execute sox command and return output', async () => {
			const args = ['--t', 'test.mp3'];
			const expected = '128k';
			const spawnEvent = new EventEmitter();
			spawnEvent.stdout = new Readable({
				read() {
					this.push('128k');
					this.push(null);
				}
			});
			spawnEvent.stderr = new Readable({
				read() {
					this.push(null);
				}
			});

			const spawnSpy = jest.spyOn(ChildProcess, 'spawn').mockReturnValue(spawnEvent);

			expect(await routesService._executeSoxCommand(args)).toStrictEqual(expected);
			expect(spawnSpy).toHaveBeenCalled();
		});

		test('should not successfully execute sox command and return error', async () => {
			const args = ['--t', 'test.mp3'];
			const error = 'ENOENT';
			const spawnEvent = new EventEmitter();
			spawnEvent.stdout = new Readable({
				read() {
					this.push('');
					this.push(null);
				}
			});
			spawnEvent.stderr = new Readable({
				read() {
					this.push(error);
					this.push(null);
				}
			});

			const spawnSpy = jest.spyOn(ChildProcess, 'spawn').mockReturnValue(spawnEvent);

			expect(async () => routesService._executeSoxCommand(args)).rejects.toBe(error);
			expect(spawnSpy).toHaveBeenCalled();
		});
	});

	describe('getBitRate', () => {
		test('should successfully get bit rate info given .mp3 file', async () => {
			const filename = 'song.mp3';
			const bitRateInfo = Buffer('128k');

			jest.spyOn(routesService, '_executeSoxCommand').mockResolvedValue(bitRateInfo);

			const expected = '128000';

			expect(await routesService.getBitRate(filename)).toStrictEqual(expected);
		});

		test('should not successfully get bit rate info of .mp3 file given thrown error', async () => {
			const filename = 'song.mp3';
			const error = 'ENOENT';

			jest.spyOn(routesService, '_executeSoxCommand').mockRejectedValue(new Error(error));

			expect(await routesService.getBitRate(filename)).toStrictEqual(config.constants.fallbackBitRate);
		});
	});

	describe('getFileInfo', () => {
		test('should successfully response an object containing file name and type', async () => {
			const filename = '/home/index.html';
			const type = '.html';
			const expectedFullPath = path.join(publicDirectory, filename);

			jest.spyOn(fsPromises, 'access').mockResolvedValue();
			jest.spyOn(path, 'extname').mockReturnValue(type);

			const expected = {
				name: expectedFullPath,
				type: type
			};

			expect(await routesService.getFileInfo(filename)).toStrictEqual(expected);
		});
	});

	describe('getFileStream', () => {
		test('should successfully response an object containing file stream and type', async () => {
			const filename = '/home/index.html';

			const mockFileStream = TestUtil.generateReadableStream(['data']);

			const expectedFileInfo = { name: filename, type: '.html' };
			const expected = {
				stream: mockFileStream,
				type: expectedFileInfo.type
			};

			jest.spyOn(RoutesService.prototype, RoutesService.prototype.getFileInfo.name).mockReturnValue(expectedFileInfo);
			jest.spyOn(RoutesService.prototype, RoutesService.prototype.createFileStream.name).mockReturnValue(mockFileStream);

			expect(await routesService.getFileStream(filename)).toStrictEqual(expected);
		});
	});

	describe('broadCast', () => {
		test('should successfully broadcast to all connected clients', async () => {
			routesService.createClientStream();

			const dataStream = TestUtil.generateReadableStream('data');

			const broadCast = routesService.broadCast();

			await StreamPromises.pipeline(dataStream, broadCast);

			expect(broadCast).toBeInstanceOf(Writable);
		});

		test('should not broadcast to all connected clients given stream finished', async () => {
			const { id, clientStream } = routesService.createClientStream();
			const dataStream = TestUtil.generateReadableStream('data');
			const broadCast = routesService.broadCast();

			const clientStreamDeleteSpy = jest.spyOn(routesService.clientStreams, 'delete');

			clientStream.end();

			await StreamPromises.pipeline(dataStream, broadCast);

			expect(broadCast).toBeInstanceOf(Writable);
			expect(clientStreamDeleteSpy).toHaveBeenCalledWith(id);
		});
	});

	describe('startStreaming', () => {
		test('should successfully start streaming', async () => {
			const currentSong = 'mySong.mp3';
			routesService.currentSong = currentSong;
			const currentReadable = TestUtil.generateReadableStream(['abc']);
			const expectedResult = 'ok';
			const writableBroadCaster = TestUtil.generateWritableStream(() => {});

			jest.spyOn(routesService, routesService.getBitRate.name).mockResolvedValue(config.constants.fallbackBitRate);

			jest.spyOn(streamsAsync, streamsAsync.pipeline.name).mockResolvedValue(expectedResult);

			jest.spyOn(fs, fs.createReadStream.name).mockReturnValue(currentReadable);

			jest.spyOn(routesService, routesService.broadCast.name).mockReturnValue(writableBroadCaster);

			const expectedThrottle = config.constants.fallbackBitRate / config.constants.bitRateDivisor;
			const result = await routesService.startStreaming();

			expect(routesService.currentBitRate).toEqual(expectedThrottle);
			expect(result).toEqual(expectedResult);

			expect(routesService.getBitRate).toHaveBeenCalledWith(currentSong);
			expect(fs.createReadStream).toHaveBeenCalledWith(currentSong);
			expect(streamsAsync.pipeline).toHaveBeenCalledWith(currentReadable, routesService.throttleTransform, routesService.broadCast());
		});
	});

	describe('stopStreaming', () => {
		test('should successfully stop streaming', async () => {
			const bitRate = '128000';

			jest.spyOn(routesService, 'getBitRate').mockResolvedValue(bitRate);

			jest.spyOn(routesService, 'createFileStream').mockReturnValue(TestUtil.generateReadableStream('data'));

			await routesService.startStreaming();

			const throtleTransformSpy = jest.spyOn(routesService.throttleTransform, 'end');

			const stopStreaming = routesService.stopStreaming();

			expect(stopStreaming).toBeUndefined();
			expect(throtleTransformSpy).toHaveBeenCalled();
		});
	});
});
