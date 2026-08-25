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
import { pipe } from "../index.js";
import { reduce, toArray } from "../sinks/index.js";
import { filter, map } from "../tasks/index.js";
import { feed } from "./feed.js";
import { range } from "./range.js";


describe("feed()", () => {

	it("should create feed from array", async () => {

		const values = await feed([1, 2, 3])(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create feed from iterable", async () => {

		const values = await feed(new Set([1, 2, 3]))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create feed from async iterable", async () => {

		const values = await feed(range(1, 4))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create feed from Promise resolving to array", async () => {

		const values = await feed(Promise.resolve([1, 2, 3]))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create feed from Promise resolving to iterable", async () => {

		const values = await feed(Promise.resolve(new Set([1, 2, 3])))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create feed from Promise resolving to async iterable", async () => {

		const values = await feed(Promise.resolve(range(1, 4)()))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle Promise resolving to empty array", async () => {

		const values = await feed(Promise.resolve([]))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle delayed Promise", async () => {

		const delayedData = new Promise<number[]>(resolve => {
			setTimeout(() => resolve([1, 2, 3]), 10);
		});

		const values = await feed(delayedData)(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle Promise with async operations in pipe", async () => {

		const values = await feed(Promise.resolve([1, 2, 3]))
		(map(async x => {
			await new Promise(resolve => setTimeout(resolve, 10));
			return x*2;
		}))
		(toArray());

		expect(values).toEqual([2, 4, 6]);

	});

	it("should filter undefined from Promise-resolved data", async () => {

		const values = await feed(Promise.resolve([1, undefined, 2, undefined, 3]))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	describe("should create a compliant feed object", () => {

		it("should return async iterable when called without transform", async () => {
			expect(await pipe(feed(feed([1, 2, 3])())(toArray()))).toEqual([1, 2, 3]);
		});

		it("should apply task and return new feed", async () => {
			expect(await pipe(feed([1, 2, 3])(map(x => x*2))(toArray()))).toEqual([2, 4, 6]);
		});

		it("should apply sink and return promise", async () => {
			expect(await feed([1, 2, 3])(reduce((acc, x) => acc+x, 0))).toBe(6);
		});

		it("should chain multiple tasks", async () => {
			expect(await pipe(
				feed([1, 2, 3, 4, 5])
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			)).toEqual([4, 8]);
		});

	});

	describe("should filter undefined values", () => {

		it("should filter undefined from array feed", async () => {

			const result = await feed([1, undefined, 2, undefined, 3])(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

		it("should filter undefined from feed source", async () => {

			const result = await feed(feed([10, undefined, 20, undefined]))(toArray());

			expect(result).toEqual([10, 20]);

		});

		it("should filter undefined from iterable feed", async () => {

			const iterable = {
				* [Symbol.iterator]() {
					yield "a";
					yield undefined;
					yield "b";
					yield undefined;
					yield "c";
				}
			};

			const result = await feed(iterable)(toArray());

			expect(result).toEqual(["a", "b", "c"]);

		});

		it("should filter undefined from async iterable feed", async () => {

			async function* gen() {
				yield "x";
				yield undefined;
				yield "y";
				yield undefined;
				yield "z";
			}

			const result = await feed(gen())(toArray());

			expect(result).toEqual(["x", "y", "z"]);

		});

		it("should handle all undefined values", async () => {

			const result = await feed([undefined, undefined, undefined])(toArray());

			expect(result).toEqual([]);

		});

		it("should preserve falsy values that are not undefined", async () => {

			const result = await feed([0, false, "", null, undefined])(toArray());

			expect(result).toEqual([0, false, "", null]);

		});

		it("should filter undefined through chained operations", async () => {

			const result = await feed([1, undefined, 2, undefined, 3] as number[])
			(map(x => x*2))
			(toArray());

			expect(result).toEqual([2, 4, 6]);

		});

		it("should filter undefined from custom task output", async () => {

			const parseNumbers = async function* (source: AsyncIterable<string>) {
				for await (const item of source) {
					const num = parseInt(item);
					yield isNaN(num) ? undefined : num;
				}
			};

			const result = await feed(["1", "abc", "2", "xyz", "3"])(parseNumbers)(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

	});

	describe("should treat strings as atomic values", () => {

		it("should yield string as single item, not character by character", async () => {

			const result = await feed("hello")(toArray());

			expect(result).toEqual(["hello"]);

		});

		it("should yield empty string as single item", async () => {

			const result = await feed("")(toArray());

			expect(result).toEqual([""]);

		});

		it("should yield strings from array individually", async () => {

			const result = await feed(["foo", "bar", "baz"])(toArray());

			expect(result).toEqual(["foo", "bar", "baz"]);

		});

	});

	describe("should accept batches of items rather than single values", () => {

		it("should reject single values", () => {

			// @ts-expect-error single values are contributed by wrapping them in a batch

			feed(42);

		});

		it("should reject undefined", () => {

			// @ts-expect-error nothing is contributed by an empty batch

			feed(undefined);

		});

		it("should reject promised single values", () => {

			// @ts-expect-error single values are contributed by wrapping them in a batch

			feed(Promise.resolve(42));

		});

		it("should reject arrays shadowing the batch carrying them", () => {

			// @ts-expect-error array items are contributed within a batch of arrays

			feed<number[]>([1, 2]);

		});

		it("should carry array items contributed within a batch", async () => {

			const values = await feed<number[]>([[1, 2], [3, 4]])(toArray());

			expect(values).toEqual([[1, 2], [3, 4]]);

		});

	});

});
