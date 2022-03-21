import { jest, describe, test, beforeEach, expect } from '@jest/globals';
import Service from '../../../public/controller/js/service.js';

describe('#Service - Test suite for business layer', () => {
	const url = 'http://localhost:3000/controller';
	let service;

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();

		service = new Service({ url });
	});

	describe('makeRequest', () => {
		test('should make a request to backend server and return data', async () => {
			const data = {
				command: 'start'
			};

			const expected = {
				result: 'ok'
			};

			const response = {
				json: jest.fn().mockResolvedValue(expected)
			};

			global.fetch = jest.fn().mockResolvedValue(response);

			expect(await service.makeRequest(data)).toStrictEqual(expected);
			expect(global.fetch).toHaveBeenCalledWith(url, {
				method: 'POST',
				body: JSON.stringify(data)
			});
		});
	});
});
