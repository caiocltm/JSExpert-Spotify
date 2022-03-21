import { jest, describe, test, beforeEach, expect } from '@jest/globals';
import { JSDOM } from 'jsdom';
import View from '../../../public/controller/js/view.js';

function makeButtonElement({ text, classList } = { text: '', classList: { add: jest.fn(), remove: jest.fn() } }) {
	return {
		id: text,
		onclick: jest.fn(),
		classList,
		innerText: text
	};
}

function makeClassListElement(
	{ classes } = {
		classes: []
	}
) {
	const classList = new Set(classes);
	classList.contains = classList.has;
	classList.remove = classList.delete;

	return classList;
}

describe('#View - Test suite for presentation layer', () => {
	let view;
	const dom = new JSDOM();

	global.document = dom.window.document;
	global.window = dom.window;

	beforeEach(() => {
		jest.resetAllMocks();
		jest.clearAllMocks();

		jest.spyOn(document, 'getElementById').mockReturnValue(makeButtonElement());
		jest.spyOn(document, 'querySelectorAll').mockReturnValue([makeButtonElement({ text: 'start' })]);

		view = new View();
	});

	describe('constructor', () => {
		test('should successfully build View class', () => {
			const documentById = document.getElementById();

			expect(view.buttonStart).toStrictEqual(documentById);
			expect(view.buttonStop).toStrictEqual(documentById);
			expect(view.buttons).toBeInstanceOf(Function);
			expect(view.onButtonClick).toBeInstanceOf(Function);
			expect(view.DISABLE_BUTTON_TIMEOUT).toStrictEqual(500);
			expect(() => view.onButtonClick('test')).not.toThrow();
		});
	});

	describe('changeCommandButtonsVisibility', () => {
		test('should unassigned class and reset onClick given hide=true', () => {
			const button = makeButtonElement();

			jest.spyOn(document, 'querySelectorAll').mockReturnValue([button]);

			view.changeCommandButtonsVisibility();

			expect(button.classList.add).toHaveBeenCalledWith('unassigned');
			expect(button.onClick.name).toStrictEqual('onClickReset');
			expect(() => button.onClick()).not.toThrow();
		});

		test('should remove unassigned class and reset onClick given hide=false', () => {
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
			jest.spyOn(view, 'changeCommandButtonsVisibility').mockReturnValue();

			view.onLoad();

			expect(view.changeCommandButtonsVisibility).toHaveBeenCalled();
		});
	});

	describe('configureOnButtonClick', () => {
		test('should add function to button onclick event', () => {
			const onClickEventFunction = () => ({});

			view.configureOnButtonClick(onClickEventFunction);

			expect(view.onButtonClick).toEqual(onClickEventFunction);
		});
	});

	describe('onStartClicked', () => {
		test('should add function to button onclick event', async () => {
			const eventData = {
				srcElement: {
					id: 'start'
				}
			};

			const onButtonClickSpyMock = jest.spyOn(view, 'onButtonClick').mockResolvedValue();
			const toggleButtonStartSpyMock = jest.spyOn(view, 'toggleButtonStart').mockReturnValue();
			const changeCommandButtonsVisibilitySpyMock = jest.spyOn(view, 'changeCommandButtonsVisibility').mockReturnValue();
			const setupButtonActionSpyMock = jest.spyOn(view, 'setupButtonAction').mockReturnValue();
			const buttonsSpyMock = jest.spyOn(view, 'buttons');

			await view.onStartClicked(eventData);

			expect(onButtonClickSpyMock).toHaveBeenCalledWith(eventData.srcElement.id);
			expect(toggleButtonStartSpyMock).toHaveBeenCalled();
			expect(changeCommandButtonsVisibilitySpyMock).toHaveBeenCalledWith(false);
			expect(setupButtonActionSpyMock).toHaveBeenCalled();
			expect(buttonsSpyMock).toHaveBeenCalled();
		});
	});

	describe('setupButtonAction', () => {
		test('should not setup onclick action given button with id equal to start', async () => {
			const button = makeButtonElement({ text: 'start' });

			expect(view.setupButtonAction(button)).toBeUndefined();
		});

		test('should setup onclick action given button with id equal to stop', async () => {
			const button = makeButtonElement({ text: 'stop' });

			const onStopButtonSpyMock = jest.spyOn(view.onStopButton, 'bind').mockReturnValue(jest.fn());

			view.setupButtonAction(button);

			expect(button.onclick).toBeDefined();
			expect(onStopButtonSpyMock).toHaveBeenCalled();
		});

		test('should setup onclick action given button with id not equal to start or stop', async () => {
			const button = makeButtonElement({ text: 'applause' });

			const onStopButtonSpyMock = jest.spyOn(view.onCommandClick, 'bind').mockReturnValue(jest.fn());

			view.setupButtonAction(button);

			expect(button.onclick).toBeDefined();
			expect(onStopButtonSpyMock).toHaveBeenCalled();
		});
	});

	describe('onCommandClick', () => {
		test('should execute events in case of click in a command button and trigger action given command', async () => {
			const button = { srcElement: makeButtonElement({ text: 'applause' }) };

			jest.spyOn(view, 'toggleDisableCommandButton').mockReturnValue();
			jest.spyOn(view, 'onButtonClick').mockResolvedValue();

			jest.useFakeTimers();

			await view.onCommandClick(button);

			jest.advanceTimersByTime(view.DISABLE_BUTTON_TIMEOUT);

			expect(view.toggleDisableCommandButton).toHaveBeenNthCalledWith(1, button.srcElement.classList);
			expect(view.toggleDisableCommandButton).toHaveBeenNthCalledWith(2, button.srcElement.classList);
			expect(view.onButtonClick).toHaveBeenCalledWith(button.srcElement.id);
		});
	});

	describe('toggleDisableCommandButton', () => {
		test('should add active class to command button given class list that not contains active class', async () => {
			const classList = makeClassListElement();

			view.toggleDisableCommandButton(classList);

			expect(classList.size).toStrictEqual(1);
			expect([...classList.values()]).toStrictEqual(['active']);
		});

		test('should remove active class to command button given class list that contains active class', () => {
			const classList = makeClassListElement({ classes: ['active'] });

			view.toggleDisableCommandButton(classList);

			expect(classList.size).toBeFalsy();
			expect(classList.has('active')).toBeFalsy();
		});
	});

	describe('onStopButton', () => {
		test('should execute events in case of click on stop button and trigger action', () => {
			const button = { srcElement: makeButtonElement({ text: 'stop' }) };

			jest.spyOn(view, 'changeCommandButtonsVisibility').mockReturnValue();
			jest.spyOn(view, 'onButtonClick').mockResolvedValue();

			view.onStopButton(button);

			expect(view.changeCommandButtonsVisibility).toHaveBeenCalledWith(true);
			expect(view.onButtonClick).toHaveBeenCalledWith(button.srcElement.id);
		});
	});

	describe('toggleButtonStart', () => {
		test('should toggle start button to hidden and button stop to active', () => {
			view.buttonStart = makeButtonElement({ classList: makeClassListElement() });
			view.buttonStop = makeButtonElement({ classList: makeClassListElement({ classes: ['hidden'] }) });

			view.toggleButtonStart();

			expect(view.buttonStart.classList.has('hidden')).toBeTruthy();
			expect(view.buttonStop.classList.has('hidden')).toBeFalsy();
		});

		test('should toggle start button to active and button stop to hidden', () => {
			view.buttonStart = makeButtonElement({ classList: makeClassListElement({ classes: ['hidden'] }) });
			view.buttonStop = makeButtonElement({ classList: makeClassListElement() });

			view.toggleButtonStart(false);

			expect(view.buttonStart.classList.has('hidden')).toBeFalsy();
			expect(view.buttonStop.classList.has('hidden')).toBeTruthy();
		});
	});
});
