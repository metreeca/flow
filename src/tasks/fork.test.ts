/*
 * Copyright © 2025-2026 Metreeca srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { sleep } from "@metreeca/core/async";
import { describe, expect, it } from "vitest";
import { items } from "../feeds/index.js";
import { Feed, pipe, Task } from "../index.js";
import { toArray } from "../sinks/index.js";
import { distinct } from "./distinct.js";
import { flat } from "./flat.js";
import { fork } from "./fork.js";
import { join } from "./join.js";
import { map } from "./map.js";
import { take } from "./take.js";


/**
 * Sorts values in ascending order, to compare feeds whose interleaving is not defined.
 */
function ordered(values: readonly number[]): readonly number[] {
	return [...values].sort((x, y) => x-y);
}

/**
 * Creates a feed yielding the given items and failing when closed.
 */
function brittle(values: readonly number[]): Feed<number> {
	return items((async function* () {
		try {
			yield* values;
		} finally {
			throw new Error("source close failed");
		}
	})());
}

/**
 * Creates a task holding every item it draws, reporting how many runs it was invoked for and how many were closed.
 */
function tracked(): {

	readonly opened: () => number,
	readonly closed: () => number,
	readonly task: Task<number, number>

} {

	const runs = { opened: 0, closed: 0 };

	return {

		opened: () => runs.opened,
		closed: () => runs.closed,

		task: feed => items((async function* () {

			runs.opened++;

			try {

				for await (const item of feed) {
					await sleep(5); // held, so that closing has to interrupt an in-flight draw
					yield item;
				}

			} finally {

				runs.closed++;

			}

		})())

	};

}

/**
 * Creates a task holding each item for `ms` milliseconds, reporting how many were held at the same time.
 */
function held(ms: number): { readonly peak: () => number, readonly task: () => Task<number, number> } {

	const flight = { current: 0, peak: 0 };

	return {

		peak: () => flight.peak,

		task: () => map(async (value: number) => {

			flight.current++;
			flight.peak = Math.max(flight.peak, flight.current);

			await sleep(ms);

			flight.current--;

			return value;

		})

	};

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("fork()", () => {

	it("should report the items of every run", async () => {

		const values = await items([1, 2, 3, 4])(fork(2, map(n => n*10)))(toArray());

		expect(ordered(values)).toEqual([10, 20, 30, 40]);

	});

	it("should hand each item to exactly one run", async () => {

		const values = await items([1, 2, 3, 4, 5, 6])(fork(3, map(n => n)))(toArray());

		expect(ordered(values)).toEqual([1, 2, 3, 4, 5, 6]);

	});

	it("should report items as they become available", async () => {

		const values = await items([30, 10, 20])(fork(3, map(async ms => {
			await sleep(ms);
			return ms;
		})))(toArray());

		expect(values).toEqual([10, 20, 30]);

	});

	it("should cap the items in flight", async () => {

		const { peak, task } = held(10);

		await items([1, 2, 3, 4, 5, 6])(fork(2, task()))(toArray());

		expect(peak()).toBe(2);

	});

	it("should open a run on demand when uncapped", async () => {

		const { peak, task } = held(10);

		await items([1, 2, 3, 4, 5, 6])(fork(0, task()))(toArray());

		expect(peak()).toBe(6);

	});

	it("should process sequentially when runs are below 1", async () => {

		const { peak, task } = held(5);

		const values = await items([1, 2, 3])(fork(-1, task()))(toArray());

		expect(peak()).toBe(1);
		expect(values).toEqual([1, 2, 3]);

	});

	it("should reject a non-integer number of runs", () => {

		expect(() => fork(1.5, map(n => n))).toThrow(TypeError);
		expect(() => fork(NaN, map(n => n))).toThrow(TypeError);
		expect(() => fork(Infinity, map(n => n))).toThrow(TypeError);

	});

	it("should invoke the task once per run", async () => {

		const invocations = { count: 0 };

		await items([1, 2, 3, 4])(fork(2, source => {
			invocations.count++;
			return source;
		}))(toArray());

		expect(invocations.count).toBe(2);

	});

	it("should scope task state to each run", async () => {

		const values = await items([1, 2, 3, 4, 5, 6])(fork(2, take(1)))(toArray());

		expect(values).toHaveLength(2);

	});

	it("should share closure state across the runs", async () => {

		const values = await items([1, 1, 2, 2, 3, 3])(fork(1, distinct()))(toArray());

		expect(ordered(values)).toEqual([1, 2, 3]);

	});

	it("should handle an empty source", async () => {

		const values = await items<number>([])(fork(2, map(n => n*10)))(toArray());

		expect(values).toEqual([]);

	});

	it("should propagate task failures", async () => {

		await expect(items([1, 2, 3])(fork(2, map(n => {
			if ( n === 2 ) { throw new Error("task failed"); }
			return n;
		})))(toArray())).rejects.toThrow("task failed");

	});

	it("should propagate failures of the source", async () => {

		const failing = items((async function* (): AsyncGenerator<number> {
			yield 1;
			throw new Error("source failed");
		})());

		await expect(failing(fork(2, map(n => n)))(toArray())).rejects.toThrow("source failed");

	});

	it("should report run failures on the next advance", async () => {

		const unhandled: unknown[] = [];
		const collect = (reason: unknown) => unhandled.push(reason);

		const failing: Task<number, number> = source => items((async function* () {
			for await (const item of source) {
				yield item*2;
				await sleep(10); // the run fails after handing over the item
				throw new Error("run failed");
			}
		})());

		const iterator = items([1, 2, 3, 4])(fork(2, failing))[Symbol.asyncIterator]();

		process.on("unhandledRejection", collect);

		try {

			await iterator.next();
			await sleep(50); // the consumer stays idle while the runs fail

		} finally {

			process.off("unhandledRejection", collect);

		}

		await expect(iterator.next()).rejects.toThrow("run failed");

		expect(unhandled).toEqual([]);

	});

	it("should not mask task failures with source close failures", async () => {

		const failing: Task<number, number> = source => items((async function* () {
			for await (const item of source) {
				await sleep(10);
				if ( item === 1 ) { throw new Error("task failed"); }
				yield item*2;
			}
		})());

		await expect(brittle([1, 2, 3, 4])(fork(2, failing))(toArray())).rejects.toThrow("task failed");

	});

	it("should suppress source close failures on early termination", async () => {

		const iterator = brittle([1, 2, 3, 4])(fork(2, map(n => n)))[Symbol.asyncIterator]();

		await iterator.next();

		await expect(iterator.return?.()).resolves.toEqual({ done: true, value: undefined });

	});

	it("should close the source on early termination", async () => {

		const closed: string[] = [];

		const source: Feed<number> = items((async function* () {
			try {
				yield 1;
				yield 2;
				await sleep(1000); // idle, so that closing has to interrupt an in-flight draw
			} finally {
				closed.push("source");
			}
		})());

		const feed = source(fork(2, map(n => n)));
		const iterator = feed[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect(closed).toEqual(["source"]);

	});

	it("should close the runs on early termination", async () => {

		const { opened, closed, task } = tracked();

		const iterator = items([1, 2, 3, 4])(fork(2, task))[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect(opened()).toBe(2);
		expect(closed()).toBe(2);

	});

	it("should close every run of an uncapped fork on early termination", async () => {

		const { opened, closed, task } = tracked();

		const paced: Feed<number> = items((async function* () {
			for await (const value of items([1, 2, 3, 4, 5, 6])) {
				await sleep(5); // idling, so that a draw is still in flight when closing starts
				yield value;
			}
		})());

		const iterator = paced(fork(0, task))[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		await sleep(100); // a run hired while closing would report itself here

		expect(closed()).toBe(opened());

	});

	it("should wrap a task expanding each item", async () => {

		const values = await items([1, 2, 3])(fork(2, feed => feed(map(async (n: number) => {
			await sleep(10);
			return items([n, n*2]);
		}))(flat())))(toArray());

		expect(ordered(values)).toEqual([1, 2, 2, 3, 4, 6]);

	});

	it("should chain with further tasks", async () => {

		const values = await pipe(
			(items([1, 2, 3, 4]))
			(fork(2, map(n => n*10)))
			(map(n => n+1))
			(toArray())
		);

		expect(ordered(values)).toEqual([11, 21, 31, 41]);

	});


	describe("with join()", () => {

		type Endpoint = { readonly url: string, readonly latency: number };
		type Retrieval = { readonly url: string, readonly landed: number };

		const CONCURRENCY = 4;

		const HOSTS = ["alpha", "beta", "gamma"];
		const LATENCIES = [50, 10, 40, 20, 30, 5]; // deliberately out of order, so responses overtake their requests


		/**
		 * Simulates the network, holding every request for the latency of its endpoint and reporting how many were in
		 * flight at once and in which order the responses landed.
		 */
		function network(): { readonly peak: () => number, readonly retrieve: () => Task<Endpoint, Retrieval> } {

			const flight = { current: 0, peak: 0 };
			const landings = { count: 0 };

			return {

				peak: () => flight.peak,

				retrieve: () => map(async ({ url, latency }: Endpoint) => {

					flight.current++;
					flight.peak = Math.max(flight.peak, flight.current);

					await sleep(latency);

					flight.current--;

					return { url, landed: ++landings.count };

				})

			};

		}

		/**
		 * Opens a feed over the endpoints a host serves.
		 */
		function endpoints(host: string): Feed<Endpoint> {
			return items(LATENCIES.map((latency, index) => ({ url: `https://${host}/${index}`, latency })));
		}


		it("should compose within join()", async () => {

			const values = await pipe(
				(items([items([1, 2]), items([3, 4])]))
				(join(map(feed => feed(fork(2, map(n => n*10))))))
				(toArray())
			);

			expect(ordered(values)).toEqual([10, 20, 30, 40]);

		});

		it("should retrieve every host concurrently, reporting responses as they land", async () => {

			const wire = network();

			const retrievals = await pipe(
				(items(HOSTS.map(endpoints)))          // one nested feed per host
				(join(map(feed => feed(fork(CONCURRENCY, wire.retrieve())))))
				(toArray())
			);

			expect(retrievals).toHaveLength(HOSTS.length*LATENCIES.length);

			// every host keeps CONCURRENCY requests in flight, and the hosts are retrieved side by side

			expect(wire.peak()).toBe(HOSTS.length*CONCURRENCY);

			// responses are reported in the order they land, never held behind a slower request issued before them

			expect(retrievals.map(({ landed }) => landed))
				.toEqual(Array.from({ length: retrievals.length }, (unused, index) => index+1));

			// the window bounds which endpoints are in flight, so the first responses are the fastest of the first
			// CONCURRENCY endpoints of every host rather than the fastest endpoint each one serves

			const window = LATENCIES.slice(0, CONCURRENCY);
			const fastest = String(window.indexOf(Math.min(...window)));

			expect(retrievals.slice(0, HOSTS.length).map(({ url }) => url.split("/").pop()))
				.toEqual(HOSTS.map(() => fastest));

		});

	});

});
