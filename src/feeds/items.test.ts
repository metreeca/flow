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
import { pipe, Sink, Task } from "../index.js";
import { reduce, toArray } from "../sinks/index.js";
import { filter, map } from "../tasks/index.js";
import { items } from "./items.js";
import { range } from "./range.js";


describe("items()", () => {

	describe("with a batch source", () => {

		it("should contribute the items of an array", async () => {

			const values = await items([1, 2, 3])(toArray());

			expect(values).toEqual([1, 2, 3]);

		});

		it("should contribute the items of an iterable", async () => {

			const values = await items(new Set([1, 2, 3]))(toArray());

			expect(values).toEqual([1, 2, 3]);

		});

		it("should contribute the items of an async iterable", async () => {

			const values = await items((async function* () { yield* [1, 2, 3]; })())(toArray());

			expect(values).toEqual([1, 2, 3]);

		});

		it("should contribute the items of a feed", async () => {

			const values = await items(range(1, 4))(toArray());

			expect(values).toEqual([1, 2, 3]);

		});

		it("should hand back a feed as it is", async () => {

			const feed = range(1, 4);

			expect(items(feed)).toBe(feed);

		});

		it("should carry the falsy items of a batch", async () => {

			const values = await items([0, false, "", null, undefined])(toArray());

			expect(values).toEqual([0, false, "", null, undefined]);

		});

		it("should carry the array items of a batch without expanding them", async () => {

			const values = await items<number[]>([[1, 2], [3, 4]])(toArray());

			expect(values).toEqual([[1, 2], [3, 4]]);

		});

		it("should contribute the strings of a batch individually", async () => {

			const values = await items(["foo", "bar"])(toArray());

			expect(values).toEqual(["foo", "bar"]);

		});

	});


	describe("with a plain source", () => {

		it("should contribute a value as a lone item", async () => {

			const values = await items(42)(toArray());

			expect(values).toEqual([42]);

		});

		it("should contribute undefined as a lone item", async () => {

			const values = await items(undefined)(toArray());

			expect(values).toEqual([undefined]);

		});

		it("should contribute an object as a lone item", async () => {

			const values = await items({ x: 1 })(toArray());

			expect(values).toEqual([{ x: 1 }]);

		});

		it("should contribute a function as a lone item", async () => {

			const value = () => 42;

			const values = await items<() => number>(value)(toArray());

			expect(values).toEqual([value]);

		});

		it("should contribute a string as a lone item, rather than character by character", async () => {

			const values = await items("report")(toArray());

			expect(values).toEqual(["report"]);

		});

		it("should contribute an empty string as a lone item", async () => {

			const values = await items("")(toArray());

			expect(values).toEqual([""]);

		});

	});


	describe("with a promised source", () => {

		it("should contribute the awaited value as a lone item", async () => {

			const values = await items(Promise.resolve(42))(toArray());

			expect(values).toEqual([42]);

		});

		it("should contribute an awaited falsy value as a lone item", async () => {

			const values = await items(Promise.resolve(undefined))(toArray());

			expect(values).toEqual([undefined]);

		});

		it("should contribute an awaited array whole, rather than expanding it", async () => {

			const values = await items<number[]>(Promise.resolve([1, 2, 3]))(toArray());

			expect(values).toEqual([[1, 2, 3]]);

		});

		it("should contribute an awaited iterable whole, rather than expanding it", async () => {

			const set = new Set([1, 2, 3]);

			const values = await items(Promise.resolve(set))(toArray());

			expect(values).toEqual([set]);

		});

		it("should contribute an awaited async iterable whole, rather than expanding it", async () => {

			const generator = (async function* () { yield* [1, 2, 3]; })();

			const values = await items(Promise.resolve(generator))(toArray());

			expect(values).toEqual([generator]);

		});

		it("should defer retrieval until the feed is consumed", async () => {

			const delayed = new Promise<number>(resolve => { setTimeout(() => resolve(42), 10); });

			const values = await items(delayed)(toArray());

			expect(values).toEqual([42]);

		});

	});


	describe("drawing the source as handed over", () => {

		it("should draw a repeatable source afresh at each pass", async () => {

			const source = items([1, 2, 3]);

			expect(await source(toArray())).toEqual([1, 2, 3]);
			expect(await source(toArray())).toEqual([1, 2, 3]);

		});

		it("should run dry after the first pass on a source drained by iteration", async () => {

			const source = items((async function* () { yield* [1, 2, 3]; })());

			expect(await source(toArray())).toEqual([1, 2, 3]);
			expect(await source(toArray())).toEqual([]);

		});

		it("should await a promised source at each pass", async () => {

			const source = items(Promise.resolve(42));

			expect(await source(toArray())).toEqual([42]);
			expect(await source(toArray())).toEqual([42]);

		});

		it("should draw nothing from the source until the feed is consumed", async () => {

			const draws = { count: 0 };

			const source = items({
				* [Symbol.iterator]() {
					draws.count++;
					yield* [1, 2, 3];
				}
			});

			expect(draws.count).toBe(0);

			await source(toArray());

			expect(draws.count).toBe(1);

		});

	});


	describe("composing as a feed", () => {

		it("should iterate directly as an async iterable", async () => {

			const values: number[] = [];

			for await (const value of items([1, 2, 3])) {
				values.push(value);
			}

			expect(values).toEqual([1, 2, 3]);

		});

		it("should report a new feed for a task", async () => {

			const values = await pipe(items([1, 2, 3])(map(x => x*2))(toArray()));

			expect(values).toEqual([2, 4, 6]);

		});

		it("should resolve to a result for a sink", async () => {

			const total = await items([1, 2, 3])(reduce((acc, x) => acc+x, 0));

			expect(total).toBe(6);

		});

		it("should chain multiple tasks", async () => {

			const values = await pipe(
				(items([1, 2, 3, 4, 5]))
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			);

			expect(values).toEqual([4, 8]);

		});

		it("should let a task delegate to further operations", async () => {

			const doubled: Task<number, number> = source => source(map(x => x*2));

			const values = await items([1, 2, 3])(doubled)(toArray());

			expect(values).toEqual([2, 4, 6]);

		});

		it("should let a sink delegate to further operations", async () => {

			const total: Sink<number, number> = source => source(reduce((acc, x) => acc+x, 0));

			expect(await items([1, 2, 3])(total)).toBe(6);

		});

		it("should hand over a feed drained by a single pass", async () => {

			const twice: Sink<number, readonly number[]> = async source => [
				...await source(toArray()),
				...await source(toArray())
			];

			expect(await items([1, 2, 3])(twice)).toEqual([1, 2, 3]); // repeatable source, single-pass feed

		});

	});

});
