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
import { chain } from "./chain.js";
import { items } from "./items.js";
import { range } from "./range.js";


describe("chain()", () => {

	it("should chain multiple pipes in order", async () => {

		const values = await chain(range(1, 3), range(10, 12))(toArray());

		expect(values).toEqual([1, 2, 10, 11]);

	});

	it("should preserve source order", async () => {

		const values = await chain(range(5, 7), range(1, 3), range(10, 12))(toArray());

		expect(values).toEqual([5, 6, 1, 2, 10, 11]);

	});

	it("should handle empty pipes", async () => {

		const values = await chain(range(1, 1), range(2, 2))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle single pipe", async () => {

		const values = await chain(range(1, 4))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should fully consume each source before next", async () => {

		const order: string[] = [];

		function tracked(name: string, values: number[]): Pipe<number> {
			return items((async function* () {
				for (const item of values) {
					order.push(`${name}:${item}`);
					yield item;
				}
			})());
		}

		await chain(tracked("a", [1, 2]), tracked("b", [3, 4]))(toArray());

		expect(order).toEqual(["a:1", "a:2", "b:3", "b:4"]);

	});

	it("should accept arrays as data sources", async () => {

		const values = await chain([1, 2], [10, 11])(toArray());

		expect(values).toEqual([1, 2, 10, 11]);

	});

	it("should accept single values as data sources", async () => {

		const values = await chain(1, 2, 3)(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should accept mixed Data<V> types", async () => {

		const values = await chain([1, 2], items([3, 4]), 5)(toArray());

		expect(values).toEqual([1, 2, 3, 4, 5]);

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

		const values = await chain(gen1(), gen2())(toArray());

		expect(values).toEqual([1, 2, 10, 11]);

	});

	it("should accept sync iterables", async () => {

		const set1 = new Set([1, 2]);
		const set2 = new Set([10, 11]);

		const values = await chain(set1, set2)(toArray());

		expect(values).toEqual([1, 2, 10, 11]);

	});

	it("should preserve order with mixed Data<V> types", async () => {

		const values = await chain([5, 6], range(1, 3), [10, 11])(toArray());

		expect(values).toEqual([5, 6, 1, 2, 10, 11]);

	});

	it("should accept Promise<Data<V>>", async () => {

		const promise1 = Promise.resolve([1, 2]);
		const promise2 = Promise.resolve([10, 11]);

		const values = await chain(promise1, promise2)(toArray());

		expect(values).toEqual([1, 2, 10, 11]);

	});

	it("should accept mixed sync and async data sources", async () => {

		const promise1 = Promise.resolve([1, 2]);
		const array = [3, 4];
		const promise2 = Promise.resolve(5);

		const values = await chain(promise1, array, promise2)(toArray());

		expect(values).toEqual([1, 2, 3, 4, 5]);

	});

	it("should preserve order when awaiting promises", async () => {

		const delayed = (ms: number, value: number[]) =>
			new Promise<number[]>(resolve => setTimeout(() => resolve(value), ms));

		const values = await chain(
			delayed(30, [1, 2]),
			delayed(10, [3, 4]),
			delayed(20, [5, 6])
		)(toArray());

		expect(values).toEqual([1, 2, 3, 4, 5, 6]);

	});

	it("should handle empty promise results", async () => {

		const values = await chain(
			Promise.resolve([]),
			Promise.resolve([1, 2]),
			Promise.resolve([])
		)(toArray());

		expect(values).toEqual([1, 2]);

	});

	it("should filter undefined values from promise results", async () => {

		const values = await chain(
			Promise.resolve([1, undefined, 2] as number[]),
			Promise.resolve([undefined, 3] as number[])
		)(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle promise rejections", async () => {

		const rejected = Promise.reject(new Error("test error"));
		const valid = Promise.resolve([1, 2]);

		await expect(chain(valid, rejected)(toArray())).rejects.toThrow("test error");

	});

	it("should handle complex mixed sources", async () => {

		async function* asyncGen() {
			yield 1;
			yield 2;
		}

		const values = await chain(
			Promise.resolve([3, 4]),
			asyncGen(),
			new Set([5, 6]),
			Promise.resolve(items([7, 8])),
			9
		)(toArray());

		expect(values).toEqual([3, 4, 1, 2, 5, 6, 7, 8, 9]);

	});

	it("should await each promise before processing next", async () => {

		const events: string[] = [];

		// Track when promises are awaited vs when they start
		const trackingPromise = (id: string, value: number[]) => {
			events.push(`created-${id}`);
			return new Promise<number[]>(resolve => {
				events.push(`started-${id}`);
				setTimeout(() => {
					events.push(`resolved-${id}`);
					resolve(value);
				}, 10);
			});
		};

		const p1 = trackingPromise("p1", [1]);
		const p2 = trackingPromise("p2", [2]);
		const p3 = trackingPromise("p3", [3]);

		const result = await chain(p1, p2, p3)(toArray());

		expect(result).toEqual([1, 2, 3]);

		// Verify promises were created before chain execution
		expect(events.slice(0, 6)).toEqual([
			"created-p1", "started-p1",
			"created-p2", "started-p2",
			"created-p3", "started-p3"
		]);

	});

	describe("should create a compliant pipe object", () => {

		it("should return async iterable when called without transform", async () => {
			const values = await pipe(chain(range(1, 3), range(10, 12))(toArray()));
			expect(values).toEqual([1, 2, 10, 11]);
		});

		it("should apply task and return new pipe", async () => {
			const values = await pipe(chain(range(1, 3), range(10, 12))(map(x => x*2))(toArray()));
			expect(values).toEqual([2, 4, 20, 22]);
		});

		it("should apply sink and return promise", async () => {
			expect(await chain(range(1, 3), range(10, 12))(reduce((acc, x) => acc+x, 0))).toBe(24);
		});

		it("should chain multiple tasks", async () => {
			const values = await pipe(
				chain(range(1, 4), range(10, 13))
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			);
			expect(values).toEqual([4, 20, 24]);
		});

	});

});
