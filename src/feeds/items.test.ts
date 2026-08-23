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
import { items } from "./items.js";
import { range } from "./range.js";


describe("items()", () => {

	it("should create pipe from single value", async () => {

		const values = await items(42)(toArray());

		expect(values).toEqual([42]);

	});

	it("should create pipe from array", async () => {

		const values = await items([1, 2, 3])(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create pipe from iterable", async () => {

		const values = await items(new Set([1, 2, 3]))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create pipe from async iterable", async () => {

		const values = await items(range(1, 4))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create pipe from Promise resolving to value", async () => {

		const values = await items(Promise.resolve(42))(toArray());

		expect(values).toEqual([42]);

	});

	it("should create pipe from Promise resolving to array", async () => {

		const values = await items(Promise.resolve([1, 2, 3]))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create pipe from Promise resolving to iterable", async () => {

		const values = await items(Promise.resolve(new Set([1, 2, 3])))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should create pipe from Promise resolving to async iterable", async () => {

		const values = await items(Promise.resolve(range(1, 4)()))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle Promise resolving to undefined", async () => {

		const values = await items(Promise.resolve(undefined))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle delayed Promise", async () => {

		const delayedData = new Promise<number[]>(resolve => {
			setTimeout(() => resolve([1, 2, 3]), 10);
		});

		const values = await items(delayedData)(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle Promise with async operations in pipeline", async () => {

		const values = await items(Promise.resolve([1, 2, 3]))
		(map(async x => {
			await new Promise(resolve => setTimeout(resolve, 10));
			return x*2;
		}))
		(toArray());

		expect(values).toEqual([2, 4, 6]);

	});

	it("should filter undefined from Promise-resolved data", async () => {

		const values = await items(Promise.resolve([1, undefined, 2, undefined, 3]))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	describe("should create a compliant pipe object", () => {

		it("should return async iterable when called without transform", async () => {
			expect(await pipe(items(items([1, 2, 3])())(toArray()))).toEqual([1, 2, 3]);
		});

		it("should apply task and return new pipe", async () => {
			expect(await pipe(items([1, 2, 3])(map(x => x*2))(toArray()))).toEqual([2, 4, 6]);
		});

		it("should apply sink and return promise", async () => {
			expect(await items([1, 2, 3])(reduce((acc, x) => acc+x, 0))).toBe(6);
		});

		it("should chain multiple tasks", async () => {
			expect(await pipe(
				items([1, 2, 3, 4, 5])
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			)).toEqual([4, 8]);
		});

	});

	describe("should filter undefined values", () => {

		it("should filter undefined from array feed", async () => {

			const result = await items([1, undefined, 2, undefined, 3])(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

		it("should filter undefined from single value feed", async () => {

			const result = await items(undefined)(toArray());

			expect(result).toEqual([]);

		});

		it("should filter undefined from function feed", async () => {

			const result = await items(() => [10, undefined, 20, undefined])(toArray());

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

			const result = await items(iterable)(toArray());

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

			const result = await items(gen())(toArray());

			expect(result).toEqual(["x", "y", "z"]);

		});

		it("should handle all undefined values", async () => {

			const result = await items([undefined, undefined, undefined])(toArray());

			expect(result).toEqual([]);

		});

		it("should preserve falsy values that are not undefined", async () => {

			const result = await items([0, false, "", null, undefined])(toArray());

			expect(result).toEqual([0, false, "", null]);

		});

		it("should filter undefined through chained operations", async () => {

			const result = await items([1, undefined, 2, undefined, 3] as number[])
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

			const result = await items(["1", "abc", "2", "xyz", "3"])(parseNumbers)(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

	});

	describe("should treat strings as atomic values", () => {

		it("should yield string as single item, not character by character", async () => {

			const result = await items("hello")(toArray());

			expect(result).toEqual(["hello"]);

		});

		it("should yield empty string as single item", async () => {

			const result = await items("")(toArray());

			expect(result).toEqual([""]);

		});

		it("should yield strings from array individually", async () => {

			const result = await items(["foo", "bar", "baz"])(toArray());

			expect(result).toEqual(["foo", "bar", "baz"]);

		});

	});

	describe("should accept multiple scalar values", () => {

		it("should create pipe from variadic number arguments", async () => {

			const result = await items(1, 2, 3, 4)(toArray());

			expect(result).toEqual([1, 2, 3, 4]);

		});

		it("should create pipe from variadic string arguments", async () => {

			const result = await items("a", "b", "c")(toArray());

			expect(result).toEqual(["a", "b", "c"]);

		});

		it("should create pipe from variadic mixed arguments", async () => {

			const result = await items<number | string>(1, "a", 2, "b")(toArray());

			expect(result).toEqual([1, "a", 2, "b"]);

		});

		it("should filter undefined from variadic arguments", async () => {

			const result = await items<number | undefined>(1, undefined, 2, undefined, 3)(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

		it("should preserve falsy values in variadic arguments", async () => {

			const result = await items<number | boolean | string | null | undefined>(
				0, false, "", null, undefined
			)(toArray());

			expect(result).toEqual([0, false, "", null]);

		});

		it("should work with single scalar argument", async () => {

			const result = await items(42)(toArray());

			expect(result).toEqual([42]);

		});

		it("should maintain backward compatibility with array argument", async () => {

			const result = await items([1, 2, 3])(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

	});

});
