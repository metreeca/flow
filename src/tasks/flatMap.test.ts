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
import { pipe } from "../index.js";
import { toArray } from "../sinks/index.js";
import { flatMap } from "./flatMap.js";
import { map } from "./map.js";


describe("sequential flatMap()", () => {

	it("should flatten mapped async iterables", async () => {

		const values = await items([1, 2, 3])(flatMap(async function* (x) {
			yield x;
			yield x*10;
		}))(toArray());

		expect(values).toEqual([1, 10, 2, 20, 3, 30]);

	});

	it("should handle empty iterables", async () => {

		const values = await items([1, 2, 3])(flatMap(async function* (x) {
			if ( x === 2 ) {
				yield x;
			}
		}))(toArray());

		expect(values).toEqual([2]);

	});

	it("should treat returned strings as atomic values", async () => {

		const values = await items([1, 2, 3])(flatMap(x => `value${x}`))(toArray());

		expect(values).toEqual(["value1", "value2", "value3"]);

	});

	it("should treat strings in arrays as items to yield", async () => {

		const values = await items([1, 2])(flatMap(x => [`a${x}`, `b${x}`]))(toArray());

		expect(values).toEqual(["a1", "b1", "a2", "b2"]);

	});

});

describe("parallel flatMap()", () => {

	it("should transform and flatten items in parallel", async () => {

		const values = await items([1, 2, 3])(flatMap(x => [x, x*2], { parallel: true }))(toArray());

		// Results should contain all flattened values (order may vary)
		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 6]);

	});

	it("should support async mappers that return arrays", async () => {

		const values = await items([1, 2, 3])(flatMap(async x => {
			await Promise.resolve();
			return [x, x*2];
		}, { parallel: true }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 6]);

	});

	it("should support async iterables", async () => {

		const values = await items([1, 2, 3])(flatMap(async function* (x) {
			yield x;
			yield x*2;
		}, { parallel: true }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 6]);

	});

	it("should respect concurrency limit", async () => {

		let concurrent = 0;
		let maxConcurrent = 0;

		const values = await items([1, 2, 3, 4])(flatMap(async x => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);

			await new Promise(resolve => setTimeout(resolve, 10));

			concurrent--;
			return [x, x*2];
		}, { parallel: 2 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 4, 6, 8]);
		expect(maxConcurrent).toBeLessThanOrEqual(2);

	});

	it("should handle single values", async () => {

		const values = await items([1, 2, 3])(flatMap(x => x*2, { parallel: true }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6]);

	});

	it("should handle errors in parallel processing", async () => {

		await expect(async () => {
			await items([1, 2, 3, 4])(flatMap(async x => {
				if ( x === 3 ) {
					throw new Error("Error at 3");
				}
				return [x, x*2];
			}, { parallel: true }))(toArray());
		}).rejects.toThrow("Error at 3");

	});

	it("should handle empty source", async () => {

		const values = await items([])(flatMap(x => [x, x*2], { parallel: true }))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle concurrency of 1", async () => {

		let concurrent = 0;
		let maxConcurrent = 0;

		const values = await items([1, 2, 3])(flatMap(async x => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);

			await new Promise(resolve => setTimeout(resolve, 10));

			concurrent--;
			return [x, x*2];
		}, { parallel: 1 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 6]);
		expect(maxConcurrent).toBe(1);

	});

	it("should handle errors during flattening", async () => {

		await expect(async () => {
			await items([1, 2, 3])(flatMap(x => {
				return function* () {
					yield x;
					if ( x === 2 ) {
						throw new Error("Flatten error");
					}
					yield x*2;
				};
			}, { parallel: true }))(toArray());
		}).rejects.toThrow("Flatten error");

	});

	it("should handle unbounded concurrency (parallel: 0)", async () => {

		let concurrent = 0;
		let maxConcurrent = 0;

		const values = await items([1, 2, 3, 4, 5, 6])(flatMap(async x => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);

			await new Promise(resolve => setTimeout(resolve, 20));

			concurrent--;
			return [x, x*2];
		}, { parallel: 0 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([1, 2, 2, 3, 4, 4, 5, 6, 6, 8, 10, 12]);
		// With unbounded concurrency, all items should be processed simultaneously
		expect(maxConcurrent).toBe(6);

	});

	it("should process nested pipes in parallel with unbounded concurrency", async () => {

		const startTimes: number[] = [];
		const testStart = Date.now();

		const values = await items([1, 2, 3, 4, 5])(flatMap(x => pipe(
			items(x)
			(map(async v => {
				startTimes.push(Date.now()-testStart);
				await new Promise(resolve => setTimeout(resolve, 50));
				return v*2;
			}))
		), { parallel: 0 }))(toArray());

		// All nested pipes should start processing within a few milliseconds
		const maxStartTime = Math.max(...startTimes);
		const minStartTime = Math.min(...startTimes);
		const startTimeSpread = maxStartTime-minStartTime;

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8, 10]);
		expect(startTimeSpread).toBeLessThan(20); // All should start within 20ms

	});

});
