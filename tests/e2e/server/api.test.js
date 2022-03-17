import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import Supertest from "supertest";
import PortFinder from "portfinder";
import config from "../../../server/config/config.js";
import Server from "../../../server/server.js";
import { Transform } from "stream";
import { setTimeout } from "timers/promises";
import { readFileSync } from "fs";
import { join } from "path";

const RETENTION_DATA_PERIOD = 200;
const commandResponse = JSON.stringify({ result: "ok" });
const possibleCommands = { start: "start", stop: "stop" };
const getAvailablePort = PortFinder.getPortPromise;

function pipeAndReadStreamData(stream, onChunk) {
	const transform = new Transform({
		transform(chunk, encoding, callback) {
			onChunk(chunk);
			callback(null, chunk);
		},
	});

	return stream.pipe(transform);
}

async function getTestServer() {
	const getSupertest = (port) => Supertest(`http://localhost:${port}`);
	const port = await getAvailablePort();

	return new Promise((resolve, reject) => {
		const server = Server.listen(port)
			.once("listening", () => {
				const testServer = getSupertest(port);
				const response = {
					testServer,
					kill() {
						server.close();
					},
				};

				return resolve(response);
			})
			.once("error", reject);
	});
}

function commandSender(testServer) {
	return {
		async send(command) {
			const response = await testServer
				.post("/controller")
				.send({ command });

			expect(response.text).toStrictEqual(commandResponse);
		},
	};
}

describe("#API e2e - Test suite", () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		jest.restoreAllMocks();
	});

	describe("GET /", () => {
		test("should be redirected to page home", async () => {
			const server = await getTestServer();
			const response = await server.testServer.get("/");

			expect(response.status).toStrictEqual(302);
			expect(response.header.location).toStrictEqual(
				config.location.home
			);

			server.kill();
		});
	});

	describe("GET /home", () => {
		test(`should sucessfully receive ${config.pages.homeHTML} page`, async () => {
			const server = await getTestServer();
			const response = await server.testServer.get(config.location.home);
			const page = readFileSync(
				join(config.dir.publicDirectory, config.pages.homeHTML)
			).toString();

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(page);

			server.kill();
		});
	});

	describe("GET /controller", () => {
		test(`should sucessfully receive ${config.pages.controllerHTML} page`, async () => {
			const server = await getTestServer();
			const response = await server.testServer.get(
				config.location.controller
			);
			const page = readFileSync(
				join(config.dir.publicDirectory, config.pages.controllerHTML)
			).toString();

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(page);

			server.kill();
		});
	});

	describe("GET static resources", () => {
		test("should sucessfully receive .html static resource", async () => {
			const htmlResource = `${config.location.controller}/index.html`;
			const server = await getTestServer();
			const response = await server.testServer.get(htmlResource);
			const staticResource = readFileSync(
				join(config.dir.publicDirectory, htmlResource)
			).toString();

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(staticResource);
			expect(response.header["content-type"]).toStrictEqual(
				config.constants.CONTENT_TYPE[".html"]
			);

			server.kill();
		});

		test("should sucessfully receive .css static resource", async () => {
			const cssResource = `${config.location.controller}/css/index.css`;
			const server = await getTestServer();
			const response = await server.testServer.get(cssResource);
			const staticResource = readFileSync(
				join(config.dir.publicDirectory, cssResource)
			).toString();

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(staticResource);
			expect(response.header["content-type"]).toStrictEqual(
				config.constants.CONTENT_TYPE[".css"]
			);

			server.kill();
		});

		test("should sucessfully receive .png static resource", async () => {
			const pngResource = `${config.location.controller}/assets/JS.png`;
			const server = await getTestServer();
			const response = await server.testServer.get(pngResource);
			const staticResource = readFileSync(
				join(config.dir.publicDirectory, pngResource)
			).toString();

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(staticResource);
			expect(response.header["content-type"]).toStrictEqual(
				config.constants.CONTENT_TYPE[".png"]
			);

			server.kill();
		});
	});

	describe("GET /stream", () => {
		test("should not receive data stream if the process is not playing", async () => {
			const server = await getTestServer();

			const onChunk = jest.fn();

			pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);

			await setTimeout(RETENTION_DATA_PERIOD);

			expect(onChunk).not.toHaveBeenCalled();

			server.kill();
		});

		test("should receive data stream if the process is playing", async () => {
			const server = await getTestServer();

			const onChunk = jest.fn();

			const { send } = commandSender(server.testServer);

			pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);

			await send(possibleCommands.start);

			await setTimeout(RETENTION_DATA_PERIOD);

			await send(possibleCommands.stop);

			const [[buffer]] = onChunk.mock.calls;

			expect(buffer).toBeInstanceOf(Buffer);
			expect(buffer.length).toBeGreaterThan(1000);

			server.kill();
		});
	});

	describe("POST /controller", () => {
		test("should sucessfully POST stream start command", async () => {
			const command = possibleCommands.start;
			const server = await getTestServer();
			const response = await server.testServer
				.post("/controller")
				.send({ command });
			const expected = JSON.stringify({ result: "ok" });

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(expected);

			server.kill();
		});

		test("should sucessfully POST stream stop command", async () => {
			const command = possibleCommands.stop;
			const server = await getTestServer();
			const response = await server.testServer
				.post("/controller")
				.send({ command });
			const expected = JSON.stringify({ result: "ok" });

			expect(response.status).toStrictEqual(200);
			expect(response.text).toStrictEqual(expected);

			server.kill();
		});
	});
});
