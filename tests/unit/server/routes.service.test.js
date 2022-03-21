import { jest, expect, describe, test, beforeEach } from '@jest/globals';
import { RoutesService } from '../../../server/services/routes.service.js';
import TestUtil from '../../_util/test.util.js';
import fs from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import config from '../../../server/config/config.js';
import crypto from 'crypto';
import ChildProcess from 'child_process';
import { Writable, PassThrough } from 'stream';
import StreamPromises from 'stream/promises';
import streamsAsync from 'stream/promises';
import Throttle from 'throttle';

const {
	dir: { publicDirectory }
} = config;

const getSpawnResponse = ({ stdout = '', stderr = '', stdin = () => {} }) => ({
	stdout: TestUtil.generateReadableStream([stdout]),
	stderr: TestUtil.generateReadableStream([stderr]),
	stdin: TestUtil.generateWritableStream(stdin)
});

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
		test('it should execute sox', async () => {
			const args = ['tutistutis.mp3'];

			const spawn = jest.spyOn(ChildProcess, ChildProcess.spawn.name);

			routesService._executeSoxCommand(args);

			expect(spawn).toHaveBeenCalledWith('sox', args);
		});
	});

	describe('getBitRate', () => {
		test('it should return bitrate of song', async () => {
			const song = 'music.mp3';
			const bitRate = ['128k', '128000'];
			const args = ['--i', '-B', song];

			const stderr = TestUtil.generateReadableStream('');
			const stdout = TestUtil.generateReadableStream([bitRate[0]]);

			const execCommand = jest.spyOn(routesService, routesService._executeSoxCommand.name).mockReturnValue({ stderr, stdout });

			const result = await routesService.getBitRate(song);

			expect(execCommand).toHaveBeenCalledWith(args);
			expect(result).toBe(bitRate[1]);
		});

		test('it should error in getBitRate', async () => {
			const song = 'music.mp3';
			const args = ['--i', '-B', song];

			const stderr = TestUtil.generateReadableStream(['error']);
			const stdout = TestUtil.generateReadableStream('');

			const execCommand = jest.spyOn(routesService, routesService._executeSoxCommand.name).mockReturnValue({ stderr, stdout });

			const result = await routesService.getBitRate(song);

			expect(execCommand).toHaveBeenCalledWith(args);
			expect(result).toBe(config.constants.fallbackBitRate);
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

	describe('readFxByName', () => {
		test('should successfully return fx audio path given name', async () => {
			const fxName = 'applause';
			const fxAudiosFound = ['applause.mp3'];
			const expected = path.join(config.dir.fxDirectory, fxAudiosFound[0]);

			jest.spyOn(fsPromises, 'readdir').mockResolvedValue(fxAudiosFound);

			expect(await routesService.readFxByName(fxName)).toStrictEqual(expected);
			expect(fsPromises.readdir).toHaveBeenCalledWith(config.dir.fxDirectory);
		});

		test('should not found fx audio path given name and throw an exception', async () => {
			const fxName = 'unknown';
			const fxAudiosFound = ['applause.mp3'];

			jest.spyOn(fsPromises, 'readdir').mockResolvedValue(fxAudiosFound);

			const result = routesService.readFxByName(fxName);

			expect(async () => result).rejects.toThrow(`Fx audio ${fxName} was not found`);
			expect(fsPromises.readdir).toHaveBeenCalledWith(config.dir.fxDirectory);
		});
	});

	describe('appendFxAudioStream', () => {
		test('should successfully append new Fx audio to current stream', async () => {
			const currentFx = 'fx.mp3';
			routesService.throttleTransform = new PassThrough();
			routesService.songReadable = TestUtil.generateReadableStream(['abc']);

			const mergedthrottleTransformMock = new PassThrough();
			const expectedFirstCallResult = 'ok1';
			const expectedSecondCallResult = 'ok2';
			const writableBroadCaster = TestUtil.generateWritableStream(() => {});

			jest.spyOn(streamsAsync, streamsAsync.pipeline.name)
				.mockResolvedValueOnce(expectedFirstCallResult)
				.mockResolvedValueOnce(expectedSecondCallResult);

			jest.spyOn(routesService, routesService.broadCast.name).mockReturnValue(writableBroadCaster);

			jest.spyOn(routesService, routesService.mergeAudioStreams.name).mockReturnValue(mergedthrottleTransformMock);

			jest.spyOn(mergedthrottleTransformMock, 'removeListener').mockReturnValue();

			jest.spyOn(routesService.throttleTransform, 'pause');

			jest.spyOn(routesService.songReadable, 'unpipe').mockImplementation();

			routesService.appendFxAudioStream(currentFx);

			expect(routesService.throttleTransform.pause).toHaveBeenCalled();
			expect(routesService.songReadable.unpipe).toHaveBeenCalledWith(routesService.throttleTransform);

			routesService.throttleTransform.emit('unpipe');

			const [call1, call2] = streamsAsync.pipeline.mock.calls;
			const [resultCall1, resultCall2] = streamsAsync.pipeline.mock.results;

			const [throttleTransformCall1, broadCastCall1] = call1;
			expect(throttleTransformCall1).toBeInstanceOf(Throttle);
			expect(broadCastCall1).toStrictEqual(writableBroadCaster);

			const [result1, result2] = await Promise.all([resultCall1.value, resultCall2.value]);

			expect(result1).toStrictEqual(expectedFirstCallResult);
			expect(result2).toStrictEqual(expectedSecondCallResult);

			const [mergedStreamCall2, throttleTransformCall2] = call2;
			expect(mergedStreamCall2).toStrictEqual(mergedthrottleTransformMock);
			expect(throttleTransformCall2).toBeInstanceOf(Throttle);
			expect(routesService.songReadable.removeListener).toHaveBeenCalled();
		});
	});

	describe('mergeAudioStreams', () => {
		test('should merge audio streams', async () => {
			const currentFx = 'fx.mp3';
			const currentReadable = TestUtil.generateReadableStream(['abc']);
			const spawnResponse = getSpawnResponse({
				stdout: '1k',
				stdin: 'myFx'
			});

			jest.spyOn(routesService, routesService._executeSoxCommand.name).mockReturnValue(spawnResponse);

			jest.spyOn(streamsAsync, streamsAsync.pipeline.name).mockResolvedValue();

			const result = routesService.mergeAudioStreams(currentFx, currentReadable);

			const [firstCall, secondCall] = streamsAsync.pipeline.mock.calls;

			const [readableCall, stdinCall] = firstCall;
			expect(readableCall).toStrictEqual(currentReadable);
			expect(stdinCall).toStrictEqual(spawnResponse.stdin);

			const [stdoutCall, transformStream] = secondCall;
			expect(stdoutCall).toStrictEqual(spawnResponse.stdout);
			expect(transformStream).toBeInstanceOf(PassThrough);

			expect(result).toBeInstanceOf(PassThrough);
		});

		test('should not merge audio streams given thrown exception', async () => {
			const currentFx = 'fx.mp3';
			const currentReadable = TestUtil.generateReadableStream(['abc']);
			const spawnResponse = getSpawnResponse({
				stdout: '1k',
				stdin: 'myFx'
			});

			jest.spyOn(routesService, routesService._executeSoxCommand.name).mockReturnValue(spawnResponse);

			jest.spyOn(streamsAsync, streamsAsync.pipeline.name).mockRejectedValue(new Error('ERROR'));

			const result = routesService.mergeAudioStreams(currentFx, currentReadable);

			const [firstCall, secondCall] = streamsAsync.pipeline.mock.calls;

			const [readableCall, stdinCall] = firstCall;
			expect(readableCall).toStrictEqual(currentReadable);
			expect(stdinCall).toStrictEqual(spawnResponse.stdin);

			const [stdoutCall, transformStream] = secondCall;
			expect(stdoutCall).toStrictEqual(spawnResponse.stdout);
			expect(transformStream).toBeInstanceOf(PassThrough);

			expect(result).toBeInstanceOf(PassThrough);
		});
	});
});
