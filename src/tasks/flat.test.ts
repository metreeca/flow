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

		it("should splice the feeds the task reports", async () => {

			const values = await items([1, 2, 3])(flat(map(n => items([n, n*10]))))(toArray());

			expect(values).toEqual([1, 10, 2, 20, 3, 30]);

		});

		it("should drop items expanding to nothing", async () => {

			const values = await items([1, 2, 3])(flat(map(n => items(n%2 ? [n] : []))))(toArray());

			expect(values).toEqual([1, 3]);

		});

		it("should report the type of the feeds the task reports", async () => {

			const values = await items([1, 2])(flat(map(n => items([`<${n}>`]))))(toArray());

			expect(values).toEqual(["<1>", "<2>"]);

		});

		it("should draw the task from the whole feed", async () => {

			const values = await items([items([1, 2]), items([3, 4]), items([5, 6])])(flat(take(2)))(toArray());

			expect(values).toEqual([1, 2, 3, 4]); // the quota is spent on the feeds, not on the items of each

		});

		it("should await asynchronous mappers", async () => {

			const values = await items([1, 2])(flat(map(async n => items([n, n*10]))))(toArray());

			expect(values).toEqual([1, 10, 2, 20]);

		});

		it("should open one feed at a time", async () => {

			const order: string[] = [];

			const values = await items([1, 2])(flat(map(n => {
				order.push(`open:${n}`);
				return items([n, n*10]);
			})))(peek(n => {
				order.push(`report:${n}`);
			}))(toArray());

			expect(values).toEqual([1, 10, 2, 20]);
			expect(order).toEqual(["open:1", "report:1", "report:10", "open:2", "report:2", "report:20"]);

		});

		it("should handle an empty source", async () => {

			const values = await items<number>([])(flat(map(n => items([n]))))(toArray());

			expect(values).toEqual([]);

		});

		it("should propagate task failures", async () => {

			await expect(items([1, 2])(flat(map(n => {
				if ( n === 2 ) { throw new Error("task failed"); }
				return items([n]);
			})))(toArray())).rejects.toThrow("task failed");

		});

	});


	describe("composed with map()", () => { // applying a task to each nested feed scopes it to that feed

		const scoped = <V, R>(task: Task<V, R>): Task<Feed<V>, R> =>
			flat(map(feed => feed(task)));


		it("should apply the task within the bounds of each nested feed", async () => {

			const values = await items([items([1, 2, 3]), items([4, 5, 6])])(scoped(take(2)))(toArray());

			expect(values).toEqual([1, 2, 4, 5]);

		});

		it("should report the items of the task in source order", async () => {

			const values = await items([items([3, 1, 5]), items([6, 2, 4])])(scoped(sort()))(toArray());

			expect(values).toEqual([1, 3, 5, 2, 4, 6]); // each nested feed ordered on its own

		});

		it("should report the type of the task", async () => {

			const values = await items([items([1, 2, 3]), items([4, 5])])(scoped(batch(2)))(toArray());

			expect(values).toEqual([[1, 2], [3], [4, 5]]);

		});

		it("should drop nested feeds the task empties", async () => {

			const values = await items([items([1, 2]), items([3, 4])])(scoped(filter(n => n > 2)))(toArray());

			expect(values).toEqual([3, 4]);

		});

		it("should apply the task only when the turn of a nested feed comes", async () => {

			const order: string[] = [];

			const values = await items([items([1, 2]), items([3, 4])])(scoped(peek(n => {
				order.push(`peek:${n}`);
			})))(map(n => {
				order.push(`map:${n}`);
				return n;
			}))(toArray());

			expect(values).toEqual([1, 2, 3, 4]);
			expect(order).toEqual(["peek:1", "map:1", "peek:2", "map:2", "peek:3", "map:3", "peek:4", "map:4"]);

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
