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
import { iterate } from "./iterate.js";


describe("iterate()", () => {

	it("should repeatedly call generator until undefined", async () => {

		function counter() {
			let count = 0;
			return () => count >= 3 ? undefined : count++;
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual([0, 1, 2]);

	});

	it("should handle empty feed when first call returns undefined", async () => {

		const values = await iterate(() => undefined)(toArray());

		expect(values).toEqual([]);

	});

	it("should preserve falsy values other than undefined", async () => {

		const falsy = [0, false, "", null];
		let index = 0;

		const values = await iterate(() => index < falsy.length ? falsy[index++] : undefined)(toArray());

		expect(values).toEqual([0, false, "", null]);

	});

	it("should handle async generators", async () => {

		function asyncCounter() {
			let count = 0;
			return async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
				return count >= 3 ? undefined : count++;
			};
		}

		const values = await iterate(asyncCounter())(toArray());

		expect(values).toEqual([0, 1, 2]);

	});

	describe("should contribute values as they are", () => {

		it("should treat strings as atomic values", async () => {

			function counter() {
				let count = 0;
				return () => count >= 3 ? undefined : `value${count++}`;
			}

			const values = await iterate(counter())(toArray());

			expect(values).toEqual(["value0", "value1", "value2"]);

		});

		it("should contribute arrays without expanding them", async () => {

			const pages = [[1, 2], [3, 4]];
			let index = 0;

			const values = await iterate(() => index < pages.length ? pages[index++] : undefined)(toArray());

			expect(values).toEqual([[1, 2], [3, 4]]);

		});

		it("should contribute empty arrays rather than end the feed", async () => {

			let count = 0;

			const values = await iterate(() => count++ < 2 ? [] : undefined)(toArray());

			expect(values).toEqual([[], []]);

		});

		it("should contribute iterables without expanding them", async () => {

			let count = 0;

			const values = await iterate(() => count++ < 1 ? new Set([1, 2]) : undefined)(toArray());

			expect(values).toEqual([new Set([1, 2])]);

		});

	});

	describe("should create a compliant feed object", () => {

		it("should return async iterable when called without transform", async () => {
			function counter() {
				let count = 0;
				return () => count >= 3 ? undefined : count++;
			}

			const values = await pipe(
				iterate(counter())
				(toArray())
			);
			expect(values).toEqual([0, 1, 2]);
		});

		it("should apply task and return new feed", async () => {
			function counter() {
				let count = 0;
				return () => count >= 3 ? undefined : count++;
			}

			const values = await pipe(
				iterate(counter())
				(map(x => x*2))
				(toArray())
			);
			expect(values).toEqual([0, 2, 4]);
		});

		it("should apply sink and return promise", async () => {
			function counter() {
				let count = 0;
				return () => count >= 4 ? undefined : count++;
			}

			expect(await pipe(
				iterate(counter())
				(reduce((acc, x) => acc+x, 0))
			)).toBe(6);
		});

		it("should chain multiple tasks", async () => {
			function counter() {
				let count = 0;
				return () => count >= 6 ? undefined : count++;
			}

			expect(await pipe(
				iterate(counter())
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			)).toEqual([0, 4, 8]);
		});

	});

});
