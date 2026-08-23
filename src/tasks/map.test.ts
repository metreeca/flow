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
import { map } from "./map.js";


describe("sequential map()", () => {

	it("should transform items", async () => {

		const values = await items([1, 2, 3])(map(x => x*2))(toArray());

		expect(values).toEqual([2, 4, 6]);

	});

	it("should support async mappers", async () => {

		const values = await items([1, 2, 3])(map(async x => {
			await Promise.resolve();
			return x*2;
		}))(toArray());

		expect(values).toEqual([2, 4, 6]);

	});

	it("should change item types", async () => {

		const values = await items([1, 2, 3])(map(x => `value-${x}`))(toArray());

		expect(values).toEqual(["value-1", "value-2", "value-3"]);

	});

});

describe("parallel map()", () => {

	it("should transform items in parallel", async () => {

		const values = await items([1, 2, 3, 4])(map(x => x*2, { parallel: true }))(toArray());

		// Results should contain all transformed values (order may vary)
		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8]);

	});

	it("should support async mappers with concurrency", async () => {

		const processingOrder: number[] = [];

		const values = await items([1, 2, 3, 4])(map(async x => {
			await new Promise(resolve => setTimeout(resolve, (5-x)*10)); // Reverse delay
			processingOrder.push(x);
			return x*2;
		}, { parallel: 2 }))(toArray());

		// All values should be present
		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8]);

		// With concurrency=2, processing should happen in batches
		// Items may complete out of order due to varying delays

	});

	it("should use auto concurrency by default", async () => {

		const values = await items([1, 2, 3, 4, 5])(map(async x => {
			await Promise.resolve();
			return x*2;
		}, { parallel: true }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8, 10]);

	});

	it("should respect concurrency limit", async () => {

		let concurrent = 0;
		let maxConcurrent = 0;

		const values = await items([1, 2, 3, 4, 5])(map(async x => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);

			await new Promise(resolve => setTimeout(resolve, 10));

			concurrent--;
			return x*2;
		}, { parallel: 2 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8, 10]);
		expect(maxConcurrent).toBeLessThanOrEqual(2);

	});

	it("should handle errors in parallel processing", async () => {

		await expect(async () => {
			await items([1, 2, 3, 4])(map(async x => {
				if ( x === 3 ) {
					throw new Error("Error at 3");
				}
				return x*2;
			}, { parallel: true }))(toArray());
		}).rejects.toThrow("Error at 3");

	});

	it("should change item types", async () => {

		const values = await items([1, 2, 3])(map(x => `value-${x}`, { parallel: true }))(toArray());

		expect([...values].sort()).toEqual(["value-1", "value-2", "value-3"]);

	});

	it("should handle empty source", async () => {

		const values = await items([])(map(x => x*2, { parallel: true }))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle concurrency of 1", async () => {

		let concurrent = 0;
		let maxConcurrent = 0;

		const values = await items([1, 2, 3, 4])(map(async x => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);

			await new Promise(resolve => setTimeout(resolve, 10));

			concurrent--;
			return x*2;
		}, { parallel: 1 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8]);
		expect(maxConcurrent).toBe(1);

	});

	it("should clean up on early termination", async () => {

		let started = 0;
		let completed = 0;

		const iterator = items([1, 2, 3, 4, 5])(map(async x => {
			started++;
			await new Promise(resolve => setTimeout(resolve, 50));
			completed++;
			return x*2;
		}, { parallel: 2 }))()[Symbol.asyncIterator]();

		// Get first result
		await iterator.next();

		// Early termination
		await iterator.return?.();

		// Some operations may have started but iterator should be cleaned up
		expect(started).toBeGreaterThan(0);

	});

	it("should handle source iterator errors", async () => {

		async function* badSource() {
			yield 1;
			yield 2;
			throw new Error("Source failed");
		}

		await expect(async () => {
			await items(badSource())(map(x => x*2, { parallel: true }))(toArray());
		}).rejects.toThrow("Source failed");

	});

	it("should handle unbounded concurrency (parallel: 0)", async () => {

		let concurrent = 0;
		let maxConcurrent = 0;

		const values = await items([1, 2, 3, 4, 5, 6, 7, 8])(map(async x => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);

			await new Promise(resolve => setTimeout(resolve, 20));

			concurrent--;
			return x*2;
		}, { parallel: 0 }))(toArray());

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);
		// With unbounded concurrency, all items should be processed simultaneously
		expect(maxConcurrent).toBe(8);

	});

	it("should start all tasks immediately with unbounded concurrency", async () => {

		const startTimes: number[] = [];
		const testStart = Date.now();

		const values = await items([1, 2, 3, 4, 5])(map(async x => {
			startTimes.push(Date.now()-testStart);
			await new Promise(resolve => setTimeout(resolve, 50));
			return x*2;
		}, { parallel: 0 }))(toArray());

		// All tasks should start within a few milliseconds of each other
		const maxStartTime = Math.max(...startTimes);
		const minStartTime = Math.min(...startTimes);
		const startTimeSpread = maxStartTime-minStartTime;

		expect([...values].sort((a: number, b: number) => a-b)).toEqual([2, 4, 6, 8, 10]);
		expect(startTimeSpread).toBeLessThan(10); // All should start within 10ms

	});

	it("should complete faster with parallel than sequential", async () => {

		// Sequential
		const sequentialStart = Date.now();
		await items([1, 2, 3, 4])(map(async x => {
			await new Promise(resolve => setTimeout(resolve, 50));
			return x*2;
		}))(toArray());
		const sequentialTime = Date.now()-sequentialStart;

		// Parallel
		const parallelStart = Date.now();
		await items([1, 2, 3, 4])(map(async x => {
			await new Promise(resolve => setTimeout(resolve, 50));
			return x*2;
		}, { parallel: 0 }))(toArray());
		const parallelTime = Date.now()-parallelStart;

		// Sequential should take ~4x longer (4 items * 50ms)
		expect(sequentialTime).toBeGreaterThanOrEqual(190); // ~200ms
		expect(parallelTime).toBeLessThan(100); // ~50ms

	});

});
