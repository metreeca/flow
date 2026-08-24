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
import { Pipe, pipe } from "../index.js";
import { reduce, toArray } from "../sinks/index.js";
import { filter, map } from "../tasks/index.js";
import { data } from "./data.js";
import { items } from "./items.js";
import { merge } from "./merge.js";
import { range } from "./range.js";


describe("merge()", () => {

	it("should merge multiple pipes", async () => {

		const values = await merge(range(1, 3), range(10, 12))(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);

	});

	it("should handle empty pipes", async () => {

		const values = await merge(range(1, 1), range(2, 2))(toArray());

		expect(values).toEqual([]);

	});

	it("should clean up iterators on early termination", async () => {

		const cleanup: string[] = [];

		function tracked(name: string): Pipe<number> {
			return data((async function* () {
				try {
					yield 1;
					yield 2;
				} finally {
					cleanup.push(name);
				}
			})());
		}

		const merged = merge(tracked("a"), tracked("b"));
		const iterator = merged()[Symbol.asyncIterator]();

		await iterator.next();
		await iterator.return?.();

		expect(cleanup.length).toBe(2);

	});

	it("should accept arrays as data sources", async () => {

		const values = await merge([1, 2], [10, 11])(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);

	});

	it("should accept single values as data sources", async () => {

		const values = await merge(1, 2, 3)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 3]);

	});

	it("should accept mixed Data<V> types", async () => {

		const values = await merge([1, 2], items(3, 4), 5)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 3, 4, 5]);

	});

	it("should accept async iterables", async () => {

		async function* gen1() {
			yield 1;
			yield 2;
		}

		async function* gen2() {
			yield 10;
			yield 11;
		}

		const values = await merge(gen1(), gen2())(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);

	});

	it("should accept sync iterables", async () => {

		const set1 = new Set([1, 2]);
		const set2 = new Set([10, 11]);

		const values = await merge(set1, set2)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);

	});

	it("should accept Promise<Data<V>>", async () => {

		const promise1 = Promise.resolve([1, 2]);
		const promise2 = Promise.resolve([10, 11]);

		const values = await merge(promise1, promise2)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);

	});

	it("should accept mixed sync and async data sources", async () => {

		const promise1 = Promise.resolve([1, 2]);
		const array = [3, 4];
		const promise2 = Promise.resolve(5);

		const values = await merge(promise1, array, promise2)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 3, 4, 5]);

	});

	it("should handle empty promise results", async () => {

		const values = await merge(
			Promise.resolve([]),
			Promise.resolve([1, 2])
		)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2]);

	});

	it("should filter undefined values from promise results", async () => {

		const values = await merge(
			Promise.resolve([1, undefined, 2] as number[]),
			Promise.resolve([undefined, 3] as number[])
		)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 3]);

	});

	it("should handle promise rejections", async () => {

		const rejected = Promise.reject(new Error("test error"));
		const valid = Promise.resolve([1, 2]);

		await expect(merge(rejected, valid)(toArray())).rejects.toThrow("test error");

	});

	it("should handle complex mixed sources", async () => {

		async function* asyncGen() {
			yield 1;
			yield 2;
		}

		const values = await merge(
			Promise.resolve([3, 4]),
			asyncGen(),
			new Set([5, 6]),
			Promise.resolve(items(7, 8)),
			9
		)(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

	});

	describe("should create a compliant pipe object", () => {

		it("should return async iterable when called without transform", async () => {
			const values = await pipe(merge(range(1, 3), range(10, 12))(toArray()));
			expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);
		});

		it("should apply task and return new pipe", async () => {
			const values = await pipe(merge(range(1, 3), range(10, 12))(map(x => x*2))(toArray()));
			expect([...values].sort((a, b) => a-b)).toEqual([2, 4, 20, 22]);
		});

		it("should apply sink and return promise", async () => {
			expect(await merge(range(1, 3), range(10, 12))(reduce((acc, x) => acc+x, 0))).toBe(24);
		});

		it("should chain multiple tasks", async () => {
			const values = await pipe(
				merge(range(1, 4), range(10, 13))
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			);
			expect([...values].sort((a, b) => a-b)).toEqual([4, 20, 24]);
		});

	});

});
