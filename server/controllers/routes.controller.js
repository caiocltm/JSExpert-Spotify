import { RoutesService } from "../services/routes.service.js";

export class RoutesController {
	constructor(config) {
		this.config = config;
		this.routesService = new RoutesService(this.config);
	}

	async getFileStream(filename) {
		return this.routesService.getFileStream(filename);
	}
}
