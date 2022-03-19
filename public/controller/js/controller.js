export default class Controller {
	constructor({ view, service }) {
		this.view = view;
		this.service = service;
	}

	static initialize(dependencies) {
		const controller = new Controller(dependencies);

		controller.onLoad();

		return controller;
	}

	async commandReceived(command) {
		return this.service.makeRequest({
			command: command.toLowerCase()
		});
	}

	onLoad() {
		this.view.configureOnButtonClick(this.commandReceived.bind(this));
		this.view.onLoad();
	}
}
