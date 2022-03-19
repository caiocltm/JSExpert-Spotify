export default class View {
	constructor() {
		this.buttonStart = document.getElementById('start');
		this.buttonStop = document.getElementById('stop');
		this.buttons = () => Array.from(document.querySelectorAll('button:not(.unassigned)'));
		this.unassignedButtons = () => Array.from(document.querySelectorAll('button.unassigned'));

		async function onButtonClick() {}

		this.onButtonClick = onButtonClick;

		this.DISABLE_BUTTON_TIMEOUT = 500;
	}

	onLoad() {
		this.changeCommandButtonsVisibility();
		this.buttonStart.onclick = this.onStartClicked.bind(this);
	}

	changeCommandButtonsVisibility(hide = true) {
		const buttonElements = document.querySelectorAll('[name=command]');

		Array.from(buttonElements).forEach((button) => {
			const fn = hide ? 'add' : 'remove';

			button.classList[fn]('unassigned');

			function onClickReset() {}

			button.onClick = onClickReset;
		});
	}

	configureOnButtonClick(fn) {
		this.onButtonClick = fn;
	}

	async onStartClicked({ srcElement: { id: command } }) {
		await this.onButtonClick(command);

		this.toggleButtonStart();

		this.changeCommandButtonsVisibility(false);

		this.buttons().forEach(this.setupButtonAction.bind(this));
	}

	setupButtonAction(button) {
		const id = button.id.toLowerCase();

		if (id.includes('start')) return;

		if (id.includes('stop')) {
			button.onclick = this.onStopButton.bind(this);
			return;
		}

		console.log('setupButtonAction', id);
		button.onclick = this.onCommandClick.bind(this);
	}

	async onCommandClick(button) {
		const {
			srcElement: { classList, id: command }
		} = button;

		this.toggleDisableCommandButton(classList);

		await this.onButtonClick(command);

		setTimeout(() => this.toggleDisableCommandButton(classList), this.DISABLE_BUTTON_TIMEOUT);
	}

	toggleDisableCommandButton(classList) {
		if (!classList.contains('active')) {
			classList.add('active');
			return;
		}

		classList.remove('active');
	}

	onStopButton({ srcElement: { id: command } }) {
		this.toggleButtonStart(false);

		this.changeCommandButtonsVisibility(true);

		return this.onButtonClick(command);
	}

	toggleButtonStart(active = true) {
		if (active) {
			this.buttonStart.classList.add('hidden');
			this.buttonStop.classList.remove('hidden');
			return;
		}

		this.buttonStop.classList.add('hidden');
		this.buttonStart.classList.remove('hidden');
		return;
	}
}
