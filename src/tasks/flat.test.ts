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

import type { Awaitable } from "@metreeca/core/async";
import { describe, expect, it } from "vitest";
import { inlet, items, range } from "../feeds/index.js";
import { Feed, pipe, Task } from "../index.js";
import { toArray } from "../sinks/index.js";
import { batch } from "./batch.js";
import { filter } from "./filter.js";
import { flat } from "./flat.js";
import { map } from "./map.js";
import { peek } from "./peek.js";
import { sort } from "./sort.js";
import { take } from "./take.js";


describe("flat()", () => {

	it("should splice nested feeds in source order, keeping the items of each together", async () => {

		const values = await items([range(5, 8), range(1, 3)])(flat())(toArray());

		expect(values).toEqual([5, 6, 7, 1, 2]);

	});

	it("should drop empty nested feeds", async () => {

		const values = await items([items<number>([]), items([1, 2]), items<number>([])])(flat())(toArray());

		expect(values).toEqual([1, 2]);

	});

	it("should handle an empty source", async () => {

		const values = await items<Feed<number>>([])(flat())(toArray());

		expect(values).toEqual([]);

	});

	it("should splice one level only", async () => {

		const inner = items([1, 2]);

		const values = await items([items([inner])])(flat())(toArray());

		expect(values).toEqual([inner]);

	});

	it("should fully drain each nested feed before opening the next", async () => {

		const order: string[] = [];

		function tracked(name: string, values: readonly number[]): Feed<number> {
			return items((async function* () {
				for (const item of values) {
					order.push(`${name}:${item}`);
					yield item;
				}
			})());
		}

		await items([tracked("a", [1, 2]), tracked("b", [3, 4])])(flat())(toArray());

		expect(order).toEqual(["a:1", "a:2", "b:3", "b:4"]);

	});

	it("should emit the items of a nested feed as it is drained", async () => {

		const count = { next: 0 };

		const values = await pipe( // an infinite nested feed completes, as it is spliced item by item
			(items([inlet(() => count.next++)]))
			(flat())
			(take(3))
			(toArray())
		);

		expect(values).toEqual([0, 1, 2]);

	});

	it("should draw deferred nested feeds when their turn comes", async () => {

		const delayed = (ms: number, values: readonly number[]): Feed<number> =>
			items((async function* () {
				yield* await new Promise<readonly number[]>(resolve => setTimeout(() => resolve(values), ms));
			})());

		const values = await items([
			delayed(30, [1, 2]),
			delayed(10, [3, 4]),
			delayed(20, [5, 6])
		])(flat())(toArray());

		expect(values).toEqual([1, 2, 3, 4, 5, 6]);

	});

	it("should propagate failures of the nested feeds", async () => {

		const failing = items((async function* (): AsyncGenerator<number> {
			yield 1;
			throw new Error("nested failed");
		})());

		await expect(items([items([0]), failing])(flat())(toArray())).rejects.toThrow("nested failed");

	});

	it("should propagate failures of the source", async () => {

		const failing = items((async function* (): AsyncGenerator<Feed<number>> {
			yield items([1, 2]);
			throw new Error("source failed");
		})());

		await expect(failing(flat())(toArray())).rejects.toThrow("source failed");

	});

	it("should chain with further tasks", async () => {

		const values = await pipe(
			(items([items([1, 2]), items([3, 4])]))
			(flat())
			(map(n => n*2))
			(toArray())
		);

		expect(values).toEqual([2, 4, 6, 8]);

	});


	describe("with a task", () => {

		it("should apply the task to every nested feed", async () => {

			const values = await items([items([1, 2]), items([3, 4])])(flat(map(n => n*10)))(toArray());

			expect(values).toEqual([10, 20, 30, 40]);

		});

		it("should report the items of the task in source order", async () => {

			const values = await items([items([3, 1, 2]), items([6, 5, 4])])(flat(sort()))(toArray());

			expect(values).toEqual([1, 2, 3, 4, 5, 6]);

		});

		it("should scope task state to each nested feed", async () => {

			const values = await items([items([1, 2, 3]), items([4, 5, 6])])(flat(take(2)))(toArray());

			expect(values).toEqual([1, 2, 4, 5]);

		});

		it("should report the type of the task", async () => {

			const values = await items([items([1, 2, 3]), items([4, 5])])(flat(batch(2)))(toArray());

			expect(values).toEqual([[1, 2], [3], [4, 5]]);

		});

		it("should drop nested feeds the task empties", async () => {

			const values = await items([items([1, 2]), items([3, 4])])(flat(filter(n => n > 2)))(toArray());

			expect(values).toEqual([3, 4]);

		});

		it("should handle an empty source", async () => {

			const values = await items<Feed<number>>([])(flat(map(n => n*10)))(toArray());

			expect(values).toEqual([]);

		});

		it("should apply the task only when the turn of a nested feed comes", async () => {

			const order: string[] = [];

			const values = await items([items([1, 2]), items([3, 4])])(flat(peek(n => {
				order.push(`peek:${n}`);
			})))(map(n => {
				order.push(`map:${n}`);
				return n;
			}))(toArray());

			expect(values).toEqual([1, 2, 3, 4]);
			expect(order).toEqual(["peek:1", "map:1", "peek:2", "map:2", "peek:3", "map:3", "peek:4", "map:4"]);

		});

		it("should propagate task failures", async () => {

			await expect(items([items([1, 2])])(flat(map(n => {
				if ( n === 2 ) { throw new Error("task failed"); }
				return n;
			})))(toArray())).rejects.toThrow("task failed");

		});

	});


	describe("composed with map()", () => { // mapping each item to a feed and splicing expands it

		const spliced = <V, R>(mapper: (item: V) => Awaitable<Feed<R>>): Task<V, R> =>
			feed => feed(map(mapper))(flat());


		it("should expand each item into the items of its feed", async () => {

			const values = await items([1, 2, 3])(spliced(n => items([n, n*2])))(toArray());

			expect(values).toEqual([1, 2, 2, 4, 3, 6]);

		});

		it("should drop items expanding to nothing", async () => {

			const values = await items([1, 2, 3])(spliced(n => items(n%2 ? [n] : [])))(toArray());

			expect(values).toEqual([1, 3]);

		});

		it("should await asynchronous mappers", async () => {

			const values = await items([1, 2])(spliced(async n => items([n, n*2])))(toArray());

			expect(values).toEqual([1, 2, 2, 4]);

		});

		it("should expand one item at a time", async () => {

			const order: string[] = [];

			const values = await items([1, 2])(spliced(n => {
				order.push(`expand:${n}`);
				return items([n, n*10]);
			}))(peek(n => {
				order.push(`report:${n}`);
			}))(toArray());

			expect(values).toEqual([1, 10, 2, 20]);
			expect(order).toEqual(["expand:1", "report:1", "report:10", "expand:2", "report:2", "report:20"]);

		});

		it("should propagate mapper failures", async () => {

			await expect(items([1, 2])(spliced(n => {
				if ( n === 2 ) { throw new Error("mapper failed"); }
				return items([n]);
			}))(toArray())).rejects.toThrow("mapper failed");

		});

	});


	describe("composed with items()", () => { // opening a batch of feeds and splicing concatenates them

		const chained = <V>(...feeds: readonly Feed<V>[]): Feed<V> => items(feeds)(flat());


		it("should concatenate the feeds in argument order", async () => {

			const values = await chained(range(5, 7), range(1, 3), range(10, 12))(toArray());

			expect(values).toEqual([5, 6, 1, 2, 10, 11]);

		});

		it("should handle no feeds", async () => {

			const values = await chained<number>()(toArray());

			expect(values).toEqual([]);

		});

	});

});
