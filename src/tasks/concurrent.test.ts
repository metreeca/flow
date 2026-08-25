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
import { ascending } from "@metreeca/core/order";
import { describe, expect, it } from "vitest";
import { feed, items } from "../feeds/index.js";
import { Task } from "../index.js";
import { toArray } from "../sinks/index.js";
import { flatMap } from "./flatMap.js";
import { map } from "./map.js";
import { concurrent } from "./concurrent.js";


/**
 * Creates a task doubling each item after a delay, tracking the peak number of items processed concurrently.
 */
function busy(ms: (item: number) => number = () => 20): { task: Task<number, number>, peak: () => number } {

	let running = 0;
	let peak = 0;

	return {

		task: async function* (source: AsyncIterable<number>) {

			for await (const item of source) {

				running++;
				peak = Math.max(peak, running);

				await sleep(ms(item));

				running--;

				yield item*2;

			}

		},

		peak: () => peak

	};

}

/**
 * Creates a feed yielding the given items and failing when closed.
 */
async function* brittle(values: readonly number[]): AsyncGenerator<number> {
	try {
		yield* values;
	} finally {
		throw new Error("source close failed");
	}
}

/**
 * Creates a feed yielding the given items, one every `ms` milliseconds.
 */
async function* slow(values: readonly number[], ms: number): AsyncGenerator<number> {
	for (const value of values) {
		await sleep(ms);
		yield value;
	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("concurrent() validation", () => {

	it("should reject non-integer concurrency", () => {

		const task = map(async (item: number) => item);

		expect(() => concurrent(1.5, task)).toThrow(TypeError);
		expect(() => concurrent(NaN, task)).toThrow(TypeError);
		expect(() => concurrent(Infinity, task)).toThrow(TypeError);

	});

});

describe("sequential concurrent()", () => {

	it("should process items one at a time with a single run", async () => {

		const { task, peak } = busy();

		const values = await items(1, 2, 3, 4)(concurrent(1, task))(toArray());

		expect(values).toEqual([2, 4, 6, 8]);
		expect(peak()).toBe(1);

	});

	it("should preserve source order with a single run", async () => {

		const { task } = busy(item => (5-item)*20); // reverse delays

		const values = await items(1, 2, 3, 4)(concurrent(1, task))(toArray());

		expect(values).toEqual([2, 4, 6, 8]);

	});

	it("should treat non-positive concurrency as sequential", async () => {

		const { task, peak } = busy();

		const values = await items(1, 2, 3)(concurrent(0, task))(toArray());

		expect(values).toEqual([2, 4, 6]);
		expect(peak()).toBe(1);

	});

});

describe("overlapping concurrent()", () => {

	it("should process items concurrently up to the concurrency limit", async () => {

		const { task, peak } = busy();

		const values = await items(1, 2, 3, 4, 5)(concurrent(2, task))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4, 6, 8, 10]);
		expect(peak()).toBe(2);

	});

	it("should reach the full concurrency when the source can feed it", async () => {

		const { task, peak } = busy();

		const values = await items(1, 2, 3, 4, 5, 6, 7, 8)(concurrent(8, task))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
		expect(peak()).toBe(8);

	});

	it("should start every run without waiting for results", async () => {

		const starts: number[] = [];
		const start = Date.now();

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				starts.push(Date.now()-start);
				await sleep(50);
				yield item*2;
			}
		};

		const values = await items(1, 2, 3, 4, 5)(concurrent(5, task))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4, 6, 8, 10]);
		expect(Math.max(...starts)-Math.min(...starts)).toBeLessThan(10);

	});

	it("should emit results as they become available", async () => {

		const { task } = busy(item => (5-item)*20); // reverse delays

		const values = await items(1, 2, 3, 4)(concurrent(4, task))(toArray());

		expect(values).toEqual([8, 6, 4, 2]);

	});

	it("should start one run for each unit of concurrency", async () => {

		const { task } = busy(() => 1);

		let runs = 0;

		const counted: Task<number, number> = source => {
			runs++;
			return task(source);
		};

		const values = await feed(slow([1, 2, 3, 4], 20))(concurrent(10, counted))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4, 6, 8]);
		expect(runs).toBe(10); // every run started, even though the source never keeps them all busy

	});

	it("should handle an empty source", async () => {

		const { task } = busy();

		const values = await items<number>()(concurrent(4, task))(toArray());

		expect(values).toEqual([]);

	});

});

describe("concurrent() task independence", () => {

	it("should apply the wrapped task to every item exactly once", async () => {

		const processed: number[] = [];

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				processed.push(item);
				await sleep(item === 1 ? 50 : 1); // first item lags behind the others
				yield item*2;
			}
		};

		const values = await items(1, 2, 3)(concurrent(3, task))(toArray());

		expect([...processed].sort(ascending)).toEqual([1, 2, 3]);
		expect([...values].sort(ascending)).toEqual([2, 4, 6]);

	});

	it("should support tasks yielding multiple items", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				await sleep(10);
				yield item;
				yield item*10;
			}
		};

		const values = await items(1, 2, 3)(concurrent(2, task))(toArray());

		expect([...values].sort(ascending)).toEqual([1, 2, 3, 10, 20, 30]);

	});

	it("should support tasks yielding no items", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				await sleep(10);
				if ( item%2 === 0 ) { yield item; }
			}
		};

		const values = await items(1, 2, 3, 4)(concurrent(2, task))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4]);

	});

	it("should filter out undefined values yielded by the wrapped task", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				await sleep(10);
				yield item%2 === 0 ? item : undefined;
			}
		};

		const values = await items(1, 2, 3, 4)(concurrent(2, task))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4]);

	});

	it("should give each run independent task state", async () => {

		const task: Task<number, number> = async function* (source) {

			let count = 0;

			for await (const _ of source) {
				count++;
				await sleep(20);
				yield count;
			}

		};

		const values = await items(1, 2, 3, 4)(concurrent(2, task))(toArray());

		expect([...values].sort(ascending)).toEqual([1, 1, 2, 2]); // per-run counters, not a feed-wide one

	});

	it("should sustain tasks yielding many items", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				for (let step = 0; step < 10; step++) {
					await sleep(1);
					yield item*100+step;
				}
			}
		};

		const values = await items(1, 2)(concurrent(2, task))(toArray());

		expect([...values].sort(ascending)).toEqual([
			100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
			200, 201, 202, 203, 204, 205, 206, 207, 208, 209
		]);

	});

});

describe("concurrent() error handling", () => {

	it("should propagate errors thrown while processing items", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				await sleep(10);
				if ( item === 3 ) { throw new Error("task failed"); }
				yield item*2;
			}
		};

		await expect(items(1, 2, 3, 4)(concurrent(2, task))(toArray())).rejects.toThrow("task failed");

	});

	it("should propagate errors thrown while yielding results", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				yield item;
				if ( item === 2 ) { throw new Error("yield failed"); }
				yield item*10;
			}
		};

		await expect(items(1, 2, 3)(concurrent(2, task))(toArray())).rejects.toThrow("yield failed");

	});

	it("should propagate errors thrown by the source", async () => {

		async function* failing(): AsyncGenerator<number> {
			yield 1;
			yield 2;
			throw new Error("source failed");
		}

		const { task } = busy(() => 1);

		await expect(feed(failing())(concurrent(2, task))(toArray())).rejects.toThrow("source failed");

	});

	it("should report run failures on the next advance", async () => {

		const unhandled: unknown[] = [];
		const collect = (reason: unknown) => unhandled.push(reason);

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				yield item*2;
				await sleep(10); // the run fails after handing over the item
				throw new Error("task failed");
			}
		};

		const iterator = items(1, 2, 3, 4)(concurrent(2, task))()[Symbol.asyncIterator]();

		process.on("unhandledRejection", collect);

		try {

			await iterator.next();
			await sleep(50); // the consumer stays idle while the runs fail

		} finally {

			process.off("unhandledRejection", collect);

		}

		await expect(iterator.next()).rejects.toThrow("task failed");

		expect(unhandled).toEqual([]);

	});

	it("should leave the source untouched if a run cannot be created", async () => {

		let pulled = 0;
		let created = 0;

		async function* source(): AsyncGenerator<number> {
			for (const value of [1, 2, 3]) {
				pulled++;
				yield value;
			}
		}

		const { task } = busy(() => 1);

		const failing: Task<number, number> = values => {

			created++;

			if ( created === 2 ) { throw new Error("run failed"); }

			return task(values);

		};

		await expect(feed(source())(concurrent(3, failing))(toArray())).rejects.toThrow("run failed");

		await sleep(20); // leave any started run time to pull

		expect(pulled).toBe(0);

	});

	it("should not mask task failures with source close failures", async () => {

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				await sleep(10);
				if ( item === 1 ) { throw new Error("task failed"); }
				yield item*2;
			}
		};

		await expect(feed(brittle([1, 2, 3, 4]))(concurrent(2, task))(toArray())).rejects.toThrow("task failed");

	});

	it("should report source close failures on early termination", async () => {

		const { task } = busy(() => 10);

		const iterator = feed(brittle([1, 2, 3, 4]))(concurrent(2, task))()[Symbol.asyncIterator]();

		await iterator.next();

		await expect(iterator.return?.()).rejects.toThrow("source close failed");

	});

	it("should await pending operations before propagating errors", async () => {

		let started = 0;
		let settled = 0;

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				started++;
				try {
					await sleep(item === 1 ? 10 : 50); // the failing item settles first
					if ( item === 1 ) { throw new Error("task failed"); }
					yield item*2;
				} finally {
					settled++;
				}
			}
		};

		await expect(items(1, 2, 3)(concurrent(3, task))(toArray())).rejects.toThrow("task failed");

		expect(settled).toBe(started);

	});

});

describe("concurrent() early termination", () => {

	it("should close the source", async () => {

		let closed = false;

		async function* source(): AsyncGenerator<number> {
			try {
				yield* [1, 2, 3, 4, 5];
			} finally {
				closed = true;
			}
		}

		const { task } = busy(() => 10);

		const iterator = feed(source())(concurrent(2, task))()[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect(closed).toBe(true);

	});

	it("should close pending runs", async () => {

		const closed: number[] = [];

		const task: Task<number, number> = async function* (source) {
			for await (const item of source) {
				try {
					await sleep(10);
					yield item*2;
				} finally {
					closed.push(item);
				}
			}
		};

		const iterator = items(1, 2, 3, 4, 5)(concurrent(2, task))()[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect(closed.length).toBeGreaterThan(0);

	});

	it("should stop pulling items from the source", async () => {

		const pulled: number[] = [];

		async function* source(): AsyncGenerator<number> {
			for (const value of [1, 2, 3, 4, 5, 6, 7, 8]) {
				pulled.push(value);
				yield value;
			}
		}

		const { task } = busy(() => 10);

		const iterator = feed(source())(concurrent(2, task))()[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect(pulled.length).toBeLessThan(8);

	});

});

describe("concurrent() composition", () => {

	it("should wrap map()", async () => {

		const values = await items(1, 2, 3, 4)(concurrent(2, map(async (item: number) => {
			await sleep(10);
			return item*2;
		})))(toArray());

		expect([...values].sort(ascending)).toEqual([2, 4, 6, 8]);

	});

	it("should wrap flatMap()", async () => {

		const values = await items(1, 2, 3)(concurrent(2, flatMap(async (item: number) => {
			await sleep(10);
			return [item, item*2];
		})))(toArray());

		expect([...values].sort(ascending)).toEqual([1, 2, 2, 3, 4, 6]);

	});

	it("should complete faster than sequential processing", async () => {

		const sequentialStart = Date.now();
		await items(1, 2, 3, 4)(concurrent(1, busy(() => 50).task))(toArray());
		const sequentialTime = Date.now()-sequentialStart;

		const concurrentStart = Date.now();
		await items(1, 2, 3, 4)(concurrent(4, busy(() => 50).task))(toArray());
		const concurrentTime = Date.now()-concurrentStart;

		expect(sequentialTime).toBeGreaterThanOrEqual(190);
		expect(concurrentTime).toBeLessThan(100);

	});

});
