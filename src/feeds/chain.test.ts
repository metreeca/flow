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
import { chain } from "./chain.js";
import { feed } from "./feed.js";
import { items } from "./items.js";
import { range } from "./range.js";


describe("chain()", () => {

	it("should chain multiple feeds in order", async () => {

		const values = await chain(range(1, 3), range(10, 12))(toArray());

		expect(values).toEqual([1, 2, 10, 11]);

	});

	it("should preserve source order", async () => {

		const values = await chain(range(5, 7), range(1, 3), range(10, 12))(toArray());

		expect(values).toEqual([5, 6, 1, 2, 10, 11]);

	});

	it("should handle empty feeds", async () => {

		const values = await chain(range(1, 1), range(2, 2))(toArray());

		expect(values).toEqual([]);

	});

	it("should handle a single feed", async () => {

		const values = await chain(range(1, 4))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle no feeds", async () => {

		const values = await chain<number>()(toArray());

		expect(values).toEqual([]);

	});

	it("should fully consume each source before next", async () => {

		const order: string[] = [];

		function tracked(name: string, values: number[]): Feed<number> {
			return feed((async function* () {
				for (const item of values) {
					order.push(`${name}:${item}`);
					yield item;
				}
			})());
		}

		await chain(tracked("a", [1, 2]), tracked("b", [3, 4]))(toArray());

		expect(order).toEqual(["a:1", "a:2", "b:3", "b:4"]);

	});

	it("should draw deferred sources when their turn comes", async () => {

		const delayed = (ms: number, values: number[]) =>
			feed(new Promise<number[]>(resolve => setTimeout(() => resolve(values), ms)));

		const values = await chain(
			delayed(30, [1, 2]),
			delayed(10, [3, 4]),
			delayed(20, [5, 6])
		)(toArray());

		expect(values).toEqual([1, 2, 3, 4, 5, 6]);

	});

	it("should propagate source failures", async () => {

		const failing = feed(Promise.reject<number[]>(new Error("test error")));

		await expect(chain(items(1, 2), failing)(toArray())).rejects.toThrow("test error");

	});

	describe("should create a compliant feed object", () => {

		it("should return async iterable when called without transform", async () => {
			const values = await pipe(chain(range(1, 3), range(10, 12))(toArray()));
			expect(values).toEqual([1, 2, 10, 11]);
		});

		it("should apply task and return new feed", async () => {
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
