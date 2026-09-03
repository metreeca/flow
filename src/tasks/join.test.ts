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
import { Feed, pipe, Sink, Task } from "../index.js";
import { toArray } from "../sinks/index.js";
import { batch } from "./batch.js";
import { filter } from "./filter.js";
import { join } from "./join.js";
import { map } from "./map.js";
import { take } from "./take.js";


/**
 * Creates a feed yielding the given items, one every `ms` milliseconds.
 */
function delayed(ms: number, values: readonly number[]): Feed<number> {
	return items((async function* () {
		for (const value of values) {
			await sleep(ms);
			yield value;
		}
	})());
}

/**
 * Creates a feed drawing from a fixed iterator, as a custom feed honouring the contract by hand may.
 */
function custom<V>(iterator: AsyncIterator<V>): Feed<V> {

	function feed<R>(task: Task<V, R>): Feed<R>;
	function feed<R>(sink: Sink<V, R>): Promise<R>;

	function feed<R>(step: Task<V, R> | Sink<V, R>): unknown {
		return step(items({ [Symbol.asyncIterator]: () => iterator }));
	}

	return Object.assign(feed, { [Symbol.asyncIterator]: () => iterator });

}

/**
 * Sorts values in ascending order, to compare feeds whose interleaving is not defined.
 */
function ordered(values: readonly number[]): readonly number[] {
	return [...values].sort((x, y) => x-y);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("join()", () => {

	it("should interleave nested feeds into a single feed", async () => {

		const values = await items([items([1, 2]), items([3, 4])])(join())(toArray());

		expect(ordered(values)).toEqual([1, 2, 3, 4]);

	});

	it("should emit items as they become available", async () => {

		const values = await items([delayed(30, [1]), delayed(10, [2]), delayed(20, [3])])(join())(toArray());

		expect(values).toEqual([2, 3, 1]);

	});

	it("should preserve the order of the items of each nested feed", async () => {

		const values = await items([delayed(10, [1, 2, 3]), delayed(15, [4, 5, 6])])(join())(toArray());

		expect(values.filter(value => value <= 3)).toEqual([1, 2, 3]);
		expect(values.filter(value => value >= 4)).toEqual([4, 5, 6]);

	});

	it("should open nested feeds as the source yields them", async () => {

		const opened: number[] = [];

		const tracked = (name: number, ms: number): Feed<number> => items((async function* () {
			opened.push(name);
			await sleep(ms);
			yield name;
		})());

		const values = await items([tracked(1, 30), tracked(2, 10)])(join())(toArray());

		expect(opened).toEqual([1, 2]); // both drawn before either yields
		expect(values).toEqual([2, 1]);

	});

	it("should drop empty nested feeds", async () => {

		const values = await items([items<number>([]), items([1, 2]), items<number>([])])(join())(toArray());

		expect(ordered(values)).toEqual([1, 2]);

	});

	it("should handle an empty source", async () => {

		const values = await items<Feed<number>>([])(join())(toArray());

		expect(values).toEqual([]);

	});

	it("should splice one level only", async () => {

		const inner = items([1, 2]);

		const values = await items([items([inner])])(join())(toArray());

		expect(values).toEqual([inner]);

	});

	it("should close the nested feeds on early termination", async () => {

		const closed: string[] = [];

		const tracked = (name: string): Feed<number> => items((async function* () {
			try {
				await sleep(10); // let the source open every nested feed before any item is drawn
				yield 1;
				yield 2;
			} finally {
				closed.push(name);
			}
		})());

		const feed = items([tracked("a"), tracked("b")])(join());
		const iterator = feed[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect([...closed].sort()).toEqual(["a", "b"]);

	});

	it("should close the nested feeds on failure", async () => {

		const closed: string[] = [];

		const tracked = (name: string, failing: boolean): Feed<number> => items((async function* () {
			try {
				await sleep(10); // let the source open every nested feed before any item is drawn
				if ( failing ) { throw new Error("nested failed"); }
				yield 1;
			} finally {
				closed.push(name);
			}
		})());

		await expect(items([tracked("a", true), tracked("b", false)])(join())(toArray()))
			.rejects.toThrow("nested failed");

		expect([...closed].sort()).toEqual(["a", "b"]);

	});

	it("should report a failure raised while the consumer is idle on the next advance", async () => {

		const unhandled: unknown[] = [];
		const collect = (reason: unknown) => unhandled.push(reason);

		const failing: Feed<number> = items((async function* () {
			yield 1;
			await sleep(10); // the nested feed fails after handing over the item
			throw new Error("nested failed");
		})());

		const iterator = items([failing])(join())[Symbol.asyncIterator]();

		process.on("unhandledRejection", collect);

		try {

			await iterator.next();
			await sleep(50); // the consumer stays idle while the nested feed fails

		} finally {

			process.off("unhandledRejection", collect);

		}

		await expect(iterator.next()).rejects.toThrow("nested failed");

		expect(unhandled).toEqual([]);

	});

	it("should suppress failures reported while closing", async () => {

		const hostile = custom<number>({
			next: async () => ({ done: false, value: 1 }),
			return: () => { throw new Error("close failed"); }
		});

		const feed = items([hostile])(join());
		const iterator = feed[Symbol.asyncIterator]();

		await iterator.next();

		await expect(iterator.return?.()).resolves.toEqual({ done: true, value: undefined });

	});

	it("should propagate failures of the nested feeds", async () => {

		const failing = items((async function* (): AsyncGenerator<number> {
			yield 1;
			throw new Error("nested failed");
		})());

		await expect(items([items([0]), failing])(join())(toArray())).rejects.toThrow("nested failed");

	});

	it("should propagate failures of the source", async () => {

		const failing = items((async function* (): AsyncGenerator<Feed<number>> {
			yield items([1, 2]);
			throw new Error("source failed");
		})());

		await expect(failing(join())(toArray())).rejects.toThrow("source failed");

	});

	it("should chain with further tasks", async () => {

		const values = await pipe(
			(items([items([1, 2]), items([3, 4])]))
			(join())
			(map(n => n*2))
			(toArray())
		);

		expect(ordered(values)).toEqual([2, 4, 6, 8]);

	});


	describe("with a task", () => {

		it("should apply the task to every nested feed", async () => {

			const values = await items([items([1, 2]), items([3, 4])])(join(map(n => n*10)))(toArray());

			expect(ordered(values)).toEqual([10, 20, 30, 40]);

		});

		it("should scope task state to each nested feed", async () => {

			const values = await items([items([1, 2, 3]), items([4, 5, 6])])(join(take(2)))(toArray());

			expect(ordered(values)).toEqual([1, 2, 4, 5]);

		});

		it("should report the type of the task", async () => {

			const values = await items([items([1, 2, 3]), items([4, 5])])(join(batch(2)))(toArray());

			expect(values).toHaveLength(3);
			expect(values).toContainEqual([1, 2]);
			expect(values).toContainEqual([3]);
			expect(values).toContainEqual([4, 5]);

		});

		it("should drop nested feeds the task empties", async () => {

			const values = await items([items([1, 2]), items([3, 4])])(join(filter(n => n > 2)))(toArray());

			expect(ordered(values)).toEqual([3, 4]);

		});

		it("should interleave the items the task reports", async () => {

			const values = await items([delayed(30, [1]), delayed(10, [2])])(join(map(n => n*10)))(toArray());

			expect(values).toEqual([20, 10]);

		});

		it("should handle an empty source", async () => {

			const values = await items<Feed<number>>([])(join(map(n => n*10)))(toArray());

			expect(values).toEqual([]);

		});

		it("should propagate task failures", async () => {

			await expect(items([items([1, 2])])(join(map(n => {
				if ( n === 2 ) { throw new Error("task failed"); }
				return n;
			})))(toArray())).rejects.toThrow("task failed");

		});

	});


	describe("composed with items()", () => { // opening a batch of feeds and interleaving merges them

		const merged = <V>(...feeds: readonly Feed<V>[]): Feed<V> => items(feeds)(join());


		it("should emit the items of the feeds as they become available", async () => {

			const values = await merged(delayed(30, [1]), delayed(10, [2]), delayed(20, [3]))(toArray());

			expect(values).toEqual([2, 3, 1]);

		});

		it("should handle no feeds", async () => {

			const values = await merged<number>()(toArray());

			expect(values).toEqual([]);

		});

	});

});
