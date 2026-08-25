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
import { Feed, pipe } from "../index.js";
import { reduce, toArray } from "../sinks/index.js";
import { filter, map } from "../tasks/index.js";
import { feed } from "./feed.js";
import { items } from "./items.js";
import { merge } from "./merge.js";
import { range } from "./range.js";


describe("merge()", () => {

	it("should merge multiple feeds", async () => {

		const values = await merge(range(1, 3), range(10, 12))(toArray());

		expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);

	});

	it("should handle empty feeds", async () => {

		const values = await merge(range(1, 1), range(2, 2))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle a single feed", async () => {

		const values = await merge(range(1, 4))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle no feeds", async () => {

		const values = await merge<number>()(toArray());

		expect(values).toEqual([]);

	});

	it("should emit items as they become available", async () => {

		function delayed(ms: number, value: number): Feed<number> {
			return feed((async function* () {
				await new Promise(resolve => setTimeout(resolve, ms));
				yield value;
			})());
		}

		const values = await merge(delayed(30, 1), delayed(10, 2), delayed(20, 3))(toArray());

		expect(values).toEqual([2, 3, 1]);

	});

	it("should clean up iterators on early termination", async () => {

		const cleanup: string[] = [];

		function tracked(name: string): Feed<number> {
			return feed((async function* () {
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

	it("should propagate source failures", async () => {

		const failing = feed(Promise.reject<number[]>(new Error("test error")));

		await expect(merge(items(1, 2), failing)(toArray())).rejects.toThrow("test error");

	});

	describe("should create a compliant feed object", () => {

		it("should return async iterable when called without transform", async () => {
			const values = await pipe(merge(range(1, 3), range(10, 12))(toArray()));
			expect([...values].sort((a, b) => a-b)).toEqual([1, 2, 10, 11]);
		});

		it("should apply task and return new feed", async () => {
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
