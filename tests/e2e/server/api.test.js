import { jest, expect, describe, test, beforeEach } from "@jest/globals";
import Supertest from "supertest";
import PortFinder from "portfinder";
import config from "../../../server/config/config.js";
import Server from "../../../server/server.js";
import { Transform } from "stream";
import { setTimeout } from "timers/promises";

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

	describe("Client workflow", () => {
		test("should not receive data stream if the process is not playing", async () => {
			const server = await getTestServer();

			const onChunk = jest.fn();

			pipeAndReadStreamData(server.testServer.get("/stream"), onChunk);

			await setTimeout(RETENTION_DATA_PERIOD);

			server.kill();

			expect(onChunk).not.toHaveBeenCalled();
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
});
