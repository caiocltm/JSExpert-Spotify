import { jest } from "@jest/globals";
import { PassThrough, Readable, Writable } from "stream";

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

	static generatePassthroughStream() {
		return new PassThrough();
	}

	static generateWritableStream(onData) {
		return new Writable({
			write(chunk, encoding, callback) {
				onData?.(chunk);
				callback(null, chunk);
			},
		});
	}

	static defaultHandlerParams(requestData = "data") {
		const requestStream = TestUtil.generateReadableStream([requestData]);
		const responseStream = TestUtil.generateWritableStream();
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
