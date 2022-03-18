import { jest, expect, describe, test } from "@jest/globals";
import superTest from "supertest";
import portfinder from "portfinder";
import { Transform } from "stream";
import { setTimeout } from "timers/promises";
import fs from "fs";
import Server from "../../../server/server.js";
import Config from "../../../server/config/config.js";

const getAvailablePort = portfinder.getPortPromise;
const RETENTION_DATA_PERIOD = 200;
const commandResponse = JSON.stringify({
	result: "ok",
});
const possibleCommands = {
	start: "start",
	stop: "stop",
};

async function getTestServer() {
	const getSupertTest = (port) => superTest(`http://localhost:${port}`);
	const port = await getAvailablePort();
	return new Promise((resolve, reject) => {
		// fix: alterei para chamar o server como uma funcao
		const server = Server()
			.listen(port)
			.once("listening", () => {
				const testServer = getSupertTest(port);
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
			const response = await testServer.post("/controller").send({
				command,
			});

			expect(response.text).toStrictEqual(commandResponse);
		},
	};
}

describe("API E2E Suite Test", () => {
	let testServer = superTest(Server());

	function pipeAndReadStreamData(stream, onChunk) {
		const transform = new Transform({
			transform(chunk, enc, cb) {
				onChunk(chunk);

				cb(null, chunk);
			},
		});
		return stream.pipe(transform);
	}

	test("GET /unknown - given an unknown route it should respond with 404 status code", async () => {
		const response = await testServer.get(`/unknown`);
		expect(response.statusCode).toStrictEqual(404);
	});

	test("GET / - it should respond with the home location and 302 status code", async () => {
		const response = await testServer.get("/");
		expect(response.headers.location).toStrictEqual("/home");
		expect(response.statusCode).toStrictEqual(302);
	});

	test("GET /home - it should respond with file stream", async () => {
		const response = await testServer.get("/home");
		const homePage = await fs.promises.readFile(
			`${Config.dir.publicDirectory}/${Config.pages.homeHTML}`
		);
		expect(response.text).toStrictEqual(homePage.toString());
	});

	test("GET /controller - it should respond with file stream", async () => {
		const response = await testServer.get("/controller");
		const homePage = await fs.promises.readFile(
			`${Config.dir.publicDirectory}/${Config.pages.controllerHTML}`
		);
		expect(response.text).toStrictEqual(homePage.toString());
	});

	describe("GET /stream", () => {
		test("it should not receive data stream if the process is not playing", async () => {
			const server = await getTestServer();
			const onChunk = jest.fn();
			pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);
			await setTimeout(RETENTION_DATA_PERIOD);
			server.kill();
			expect(onChunk).not.toHaveBeenCalled();
		});
		test("it should receive data stream if the process is playing", async () => {
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

	describe("GET static files", () => {
		test("GET /file.js - it should respond with 404 if file doesnt exists", async () => {
			const file = "file.js";
			const response = await testServer.get(`/${file}`);
			expect(response.statusCode).toStrictEqual(404);
		});

		test("GET /controller/css/index.css - given a css file it should respond with content-type text/css ", async () => {
			const file = "controller/css/index.css";
			const response = await testServer.get(`/${file}`);
			const existingPage = await fs.promises.readFile(
				`${Config.dir.publicDirectory}/${file}`
			);
			expect(response.text).toStrictEqual(existingPage.toString());
			expect(response.statusCode).toStrictEqual(200);
			expect(response.header["content-type"]).toStrictEqual("text/css");
		});

		test("GET /home/js/animation.js - given a js file it should respond with content-type text/javascript ", async () => {
			const file = "home/js/animation.js";
			const response = await testServer.get(`/${file}`);
			const existingPage = await fs.promises.readFile(
				`${Config.dir.publicDirectory}/${file}`
			);
			expect(response.text).toStrictEqual(existingPage.toString());
			expect(response.statusCode).toStrictEqual(200);
			expect(response.header["content-type"]).toStrictEqual(
				"text/javascript"
			);
		});

		test("GET /controller/index.html - given a html file it should respond with content-type text/html ", async () => {
			const file = Config.pages.controllerHTML;
			const response = await testServer.get(`/${file}`);
			const existingPage = await fs.promises.readFile(
				`${Config.dir.publicDirectory}/${file}`
			);
			expect(response.text).toStrictEqual(existingPage.toString());
			expect(response.statusCode).toStrictEqual(200);
			expect(response.header["content-type"]).toStrictEqual("text/html");
		});
	});
});
