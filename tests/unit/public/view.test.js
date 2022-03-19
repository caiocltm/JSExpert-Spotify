import { jest, describe, test, beforeEach, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import View from '../../../public/controller/js/view.js';

function makeButtonElement({ text, classList } = { text: '', classList: { add: jest.fn(), remove: jest.fn() } }) {
	return {
		onClick: jest.fn(),
		classList,
		innerText: text
	};
}

describe('#View - Test suite for presentation layer', () => {
	const dom = new JSDOM();

	global.document = dom.window.document;
	global.window = dom.window;

	beforeEach(() => {
		jest.resetAllMocks();
		jest.clearAllMocks();

		jest.spyOn(document, 'getElementById').mockReturnValue(makeButtonElement());
	});

	describe('changeCommandButtonsVisibility', () => {
		test('should unassigned class and reset onClick given hide=true', () => {
			const view = new View();
			const button = makeButtonElement();

			jest.spyOn(document, 'querySelectorAll').mockReturnValue([button]);

			view.changeCommandButtonsVisibility();

			expect(button.classList.add).toHaveBeenCalledWith('unassigned');
			expect(button.onClick.name).toStrictEqual('onClickReset');
			expect(() => button.onClick()).not.toThrow();
		});

		test('should remove unassigned class and reset onClick given hide=false', () => {
			const view = new View();
			const button = makeButtonElement();

			jest.spyOn(document, 'querySelectorAll').mockReturnValue([button]);

			view.changeCommandButtonsVisibility(false);

			expect(button.classList.add).not.toHaveBeenCalledWith('unassigned');
			expect(button.classList.remove).toHaveBeenCalledWith('unassigned');
			expect(button.onClick.name).toStrictEqual('onClickReset');
			expect(() => button.onClick()).not.toThrow();
		});
	});

	describe('onLoad', () => {
		test('should call method to change command buttons visibility', () => {
			const view = new View();

			jest.spyOn(view, 'changeCommandButtonsVisibility').mockReturnValue();

			view.onLoad();

			expect(view.changeCommandButtonsVisibility).toHaveBeenCalled();
		});
	});
});
