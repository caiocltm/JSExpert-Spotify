import { jest, describe, test, beforeEach, expect } from '@jest/globals';
import Controller from '../../../public/controller/js/controller.js';
import Service from '../../../public/controller/js/service.js';
import View from '../../../public/controller/js/view.js';

function makeButtonElement({ text, classList } = { text: '', classList: { add: jest.fn(), remove: jest.fn() } }) {
	return {
		onClick: jest.fn(),
		classList,
		innerText: text
	};
}

describe('#Controller - Test suite for controller layer', () => {
	const url = 'url';

	beforeEach(() => {
		jest.resetAllMocks();
		jest.clearAllMocks();

		jest.spyOn(document, 'getElementById').mockReturnValue(makeButtonElement());
	});

	describe('initialize', () => {
		test('should initialize controller class given dependencies and call onLoad', () => {
			const view = new View();
			const service = new Service({ url });

			const onLoadSpyMock = jest.spyOn(Controller.prototype, 'onLoad');

			const result = Controller.initialize({ view, service });

			expect(result).toBeInstanceOf(Controller);
			expect(onLoadSpyMock).toHaveBeenCalled();
		});
	});

	describe.skip('onLoad', () => {
		test('should call onLoad method on view class', () => {
			const view = new View();
			const service = new Service({ url });
			const controller = new Controller({ view, service });

			const viewOnLoadSpyMock = jest.spyOn(view, 'onLoad');

			expect(controller.onLoad()).toBeUndefined();
			expect(viewOnLoadSpyMock).toHaveBeenCalled();
		});
	});
});
