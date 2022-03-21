import { jest, describe, test, beforeEach, expect } from '@jest/globals';
import Controller from '../../../public/controller/js/controller.js';
import Service from '../../../public/controller/js/service.js';
import View from '../../../public/controller/js/view.js';

describe('#Controller - Test suite for controller layer', () => {
	const url = 'http://localhost:3000/controller';

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('initialize', () => {
		test('should initialize controller class given dependencies and call onLoad', () => {
			const view = new View();
			const service = new Service({ url });

			const onLoad = jest.spyOn(Controller.prototype, Controller.prototype.onLoad.name).mockReturnValue();

			const result = Controller.initialize({ view, service });

			expect(onLoad).toHaveBeenCalled();
			expect(result).toBeInstanceOf(Controller);
		});
	});

	test('CommandReceived', async () => {
		const view = new View();
		const service = new Service({ url });
		const controller = new Controller({ view, service });
		const command = 'start';

		const makeRequest = jest.spyOn(Service.prototype, Service.prototype.makeRequest.name).mockResolvedValue({ result: 'ok' });

		const result = await controller.commandReceived(command);

		expect(makeRequest).toHaveBeenCalledWith({ command });
		expect(result).toStrictEqual({ result: 'ok' });
	});

	describe('onLoad', () => {
		test('should call onLoad method on view class', () => {
			const view = new View();
			const service = new Service({ url });
			const controller = new Controller({ view, service });
			const bind = jest.fn().bind();

			jest.spyOn(controller.commandReceived, 'bind').mockReturnValue(bind);

			controller.view.onLoad = jest.fn();
			controller.view.configureOnButtonClick = jest.fn();

			controller.onLoad();

			expect(controller.view.onLoad).toHaveBeenCalled();
			expect(controller.view.configureOnButtonClick).toHaveBeenCalled();
		});
	});
});
