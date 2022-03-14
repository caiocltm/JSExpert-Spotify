import { jest } from "@jest/globals";
import { Readable, Writable } from "stream";

export default class TestUtil {
	static generateReadableStream(data) {
		return new Readable({
			read() {
				for (const item of data) {
					this.push(item);
				}

				this.push(null);
			},
		});
	}

	static generateWritableStream(onData) {
		return new Writable({
			write(chunk, encoding, callback) {
				onData(chunk);
				callback(null, chunk);
			},
		});
	}

	static defaultHandlerParams() {
		const requestStream = TestUtil.generateReadableStream(["data"]);
		const responseStream = TestUtil.generateWritableStream(() => ({}));
		const data = {
			request: Object.assign(requestStream, {
				headers: {},
				method: "",
				url: "",
			}),
			response: Object.assign(responseStream, {
				writeHead: jest.fn(),
				end: jest.fn(),
			}),
		};

		return {
			values: () => Object.values(data),
			...data,
		};
	}
}
