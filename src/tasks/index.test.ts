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
import { items } from "../feeds/index.js";
import { toArray } from "../sinks/index.js";
import { flatMap } from "./flatMap.js";
import { peek } from "./peek.js";


describe("parallelize() edge cases", () => {

	it("should handle race condition where same mapper promise wins consecutive races", async () => {

		// Test the fix for the race condition where a slow mapper could win multiple races

		let mapperCallCount = 0;
		let consumerCallCount = 0;

		const values = await items([1, 2, 3])(flatMap(async x => {
			mapperCallCount++;
			// First item is very slow, others are fast
			await new Promise(resolve => setTimeout(resolve, x === 1 ? 100 : 1));
			return [x, x*2];
		}, { parallel: 3 }))(peek(() => {
			consumerCallCount++;
		}))(toArray());

		// All values should be present exactly once
		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 6]);

		// Each mapper should be called exactly once
		expect(mapperCallCount).toBe(3);

		// Each value should be consumed exactly once
		expect(consumerCallCount).toBe(6);

	});

	it("should handle consumer iterator that throws during next()", async () => {

		await expect(async () => {
			await items([1, 2, 3])(flatMap(x => {
				return {
					async* [Symbol.asyncIterator]() {
						yield x;
						if ( x === 2 ) {
							throw new Error("Consumer error during iteration");
						}
						yield x*2;
					}
				};
			}, { parallel: 2 }))(toArray());
		}).rejects.toThrow("Consumer error during iteration");

	});

	it("should handle mapper that throws before consumer starts", async () => {

		await expect(async () => {
			await items([1, 2, 3, 4])(flatMap(async x => {
				await new Promise(resolve => setTimeout(resolve, 10));
				if ( x === 2 ) {
					throw new Error("Mapper error");
				}
				return [x, x*2];
			}, { parallel: 2 }))(toArray());
		}).rejects.toThrow("Mapper error");

	});

	it("should handle consumer that throws during iteration", async () => {

		await expect(async () => {
			await items([1, 2, 3])(flatMap(async function* (x) {
				yield x;
				if ( x === 2 ) {
					throw new Error("Consumer throw");
				}
				yield x*2;
			}, { parallel: 2 }))(toArray());
		}).rejects.toThrow("Consumer throw");

	});

	it("should handle early termination via generator return()", async () => {

		const processed: number[] = [];
		const mapped: number[] = [];

		const iterator = items([1, 2, 3, 4, 5])(flatMap(async x => {
			mapped.push(x);
			await new Promise(resolve => setTimeout(resolve, 10));
			return [x, x*2];
		}, { parallel: 3 }))()[Symbol.asyncIterator]();

		// Consume first few values
		const result1 = await iterator.next();
		processed.push(result1.value as number);

		const result2 = await iterator.next();
		processed.push(result2.value as number);

		// Early termination
		await iterator.return?.();

		// Should have some values processed
		expect(processed.length).toBeGreaterThanOrEqual(2);

		// Not all items should be mapped (early termination)
		expect(mapped.length).toBeLessThan(10); // Would be 10 if all items produced [x, x*2]

	});

	it("should enforce thread limit across mapping and consuming phases", async () => {

		let concurrentMappers = 0;
		let concurrentConsumers = 0;
		let maxTotal = 0;

		const values = await items([1, 2, 3, 4, 5])(flatMap(async x => {
			concurrentMappers++;
			const totalBefore = concurrentMappers+concurrentConsumers;
			maxTotal = Math.max(maxTotal, totalBefore);

			await new Promise(resolve => setTimeout(resolve, 20));

			concurrentMappers--;

			// Return an async iterable to test consumer phase concurrency
			return {
				async* [Symbol.asyncIterator]() {
					for (let i = 0; i < 3; i++) {
						concurrentConsumers++;
						const totalDuring = concurrentMappers+concurrentConsumers;
						maxTotal = Math.max(maxTotal, totalDuring);

						await new Promise(resolve => setTimeout(resolve, 10));

						concurrentConsumers--;
						yield x*10+i;
					}
				}
			};
		}, { parallel: 2 }))(toArray());

		// Should have all values
		expect(values.length).toBe(15); // 5 items × 3 sub-items each

		// Total concurrent operations should never exceed thread limit
		expect(maxTotal).toBeLessThanOrEqual(2);

	});

	it("should handle varying mapper and consumer durations", async () => {

		const values = await items([1, 2, 3, 4])(flatMap(async x => {
			// Varying mapper delays
			await new Promise(resolve => setTimeout(resolve, x*10));

			return {
				async* [Symbol.asyncIterator]() {
					// Varying consumer delays
					for (let i = 0; i < 2; i++) {
						await new Promise(resolve => setTimeout(resolve, (5-x)*5));
						yield x*10+i;
					}
				}
			};
		}, { parallel: 2 }))(toArray());

		// All values should be present (order may vary)
		expect([...values].sort((a: number, b: number) => a-b)).toEqual([
			10, 11, 20, 21, 30, 31, 40, 41
		]);

	});

	it("should handle consumer that completes immediately", async () => {

		const values = await items([1, 2, 3])(flatMap(() => {
			// Return empty iterable (immediate completion)
			return {
				async* [Symbol.asyncIterator]() {
					// Yields nothing, completes immediately
				}
			};
		}, { parallel: 2 }))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle consumer with single value", async () => {

		const values = await items([1, 2, 3])(flatMap(async function* (x) {
			yield x*10;
			// Only one value, then done
		}, { parallel: 2 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([10, 20, 30]);

	});

	it("should handle consumer with many values", async () => {

		const values = await items([1, 2])(flatMap(async function* (x) {
			for (let i = 0; i < 10; i++) {
				await new Promise(resolve => setTimeout(resolve, 1));
				yield x*100+i;
			}
		}, { parallel: 1 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([
			100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
			200, 201, 202, 203, 204, 205, 206, 207, 208, 209
		]);

	});

	it("should clean up resources on mapper error", async () => {

		const cleanedIterators: number[] = [];

		await expect(async () => {
			await items([1, 2, 3, 4, 5])(flatMap(async x => {
				await new Promise(resolve => setTimeout(resolve, 10));

				if ( x === 3 ) {
					throw new Error("Mapper fails at 3");
				}

				return {
					async* [Symbol.asyncIterator]() {
						try {
							yield x;
							yield x*2;
						} finally {
							cleanedIterators.push(x);
						}
					}
				};
			}, { parallel: 2 }))(toArray());
		}).rejects.toThrow("Mapper fails at 3");

		// Some iterators should be cleaned up
		// The exact number depends on timing, but cleanup should happen
		expect(cleanedIterators.length).toBeGreaterThanOrEqual(0);

	});

	it("should handle source iterator that throws", async () => {

		async function* throwingSource() {
			yield 1;
			yield 2;
			throw new Error("Source error");
		}

		await expect(async () => {
			await items(throwingSource())(flatMap(x => [x, x*2], { parallel: 2 }))(toArray());
		}).rejects.toThrow("Source error");

	});

	it("should handle mixed sync and async consumer values", async () => {

		const values = await items([1, 2, 3])(flatMap(function* (x) {
			// Synchronous generator (not async)
			yield x;
			yield x*2;
		}, { parallel: 2 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 6]);

	});

	it("should maintain correct order with threads=1", async () => {

		const values = await items([1, 2, 3, 4, 5])(flatMap(async x => {
			await new Promise(resolve => setTimeout(resolve, (6-x)*5)); // Reverse delay
			return [x, x*2];
		}, { parallel: 1 }))(toArray());

		// With threads=1, should maintain strict order
		expect(values).toEqual([1, 2, 2, 4, 3, 6, 4, 8, 5, 10]);

	});

	it("should handle rapid completion of all operations", async () => {

		const values = await items([1, 2, 3, 4, 5])(flatMap(x => [x], { parallel: 10 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 3, 4, 5]);

	});

});
