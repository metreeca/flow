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
import { range } from "./range.js";


describe("iterate()", () => {

	it("should repeatedly call generator until undefined", async () => {

		function counter() {
			let count = 0;
			return () => count >= 3 ? undefined : count++;
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual([0, 1, 2]);

	});

	it("should stop on empty array", async () => {

		function counter() {
			let count = 0;
			return () => count >= 2 ? [] : [count++];
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual([0, 1]);

	});

	it("should stop on empty iterator", async () => {

		function counter() {
			let count = 0;
			return () => count >= 2 ? new Set() : new Set([count++]);
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual([0, 1]);

	});

	it("should flatten arrays from each call", async () => {

		function pager() {
			let page = 0;
			return () => {
				if ( page >= 3 ) {
					return undefined;
				}
				const start = page*2;
				page++;
				return [start, start+1];
			};
		}

		const values = await iterate(pager())(toArray());

		expect(values).toEqual([0, 1, 2, 3, 4, 5]);

	});

	it("should handle single values", async () => {

		function counter() {
			let count = 0;
			return () => count >= 3 ? undefined : count++;
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual([0, 1, 2]);

	});

	it("should handle iterables", async () => {

		function pager() {
			let page = 0;
			return () => {
				if ( page >= 2 ) {
					return undefined;
				}
				const start = page*2;
				page++;
				return new Set([start, start+1]);
			};
		}

		const values = await iterate(pager())(toArray());

		expect(values).toEqual([0, 1, 2, 3]);

	});

	it("should handle pipes", async () => {

		function counter() {
			let count = 0;
			return () => count >= 2 ? undefined : range(count++, count);
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual([0, 1]);

	});

	it("should treat strings as atomic values", async () => {

		function counter() {
			let count = 0;
			return () => count >= 3 ? undefined : `value${count++}`;
		}

		const values = await iterate(counter())(toArray());

		expect(values).toEqual(["value0", "value1", "value2"]);

	});

	it("should handle empty stream when first call returns undefined", async () => {

		const values = await iterate(() => undefined)(toArray());

		expect(values).toEqual([]);

	});

	it("should handle empty stream when first call returns empty array", async () => {

		const values = await iterate(() => [])(toArray());

		expect(values).toEqual([]);

	});

	it("should work with generator tracking state", async () => {

		const pages = ["page1", "page2", "page3"];
		let index = 0;

		const values = await iterate(() => {
			if ( index >= pages.length ) {
				return undefined;
			}
			return pages[index++];
		})(toArray());

		expect(values).toEqual(["page1", "page2", "page3"]);

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

	it("should handle async generators with arrays", async () => {

		function asyncPager() {
			let page = 0;
			return async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
				if ( page >= 3 ) {
					return undefined;
				}
				const start = page*2;
				page++;
				return [start, start+1];
			};
		}

		const values = await iterate(asyncPager())(toArray());

		expect(values).toEqual([0, 1, 2, 3, 4, 5]);

	});

	it("should handle async generators returning promises of pipes", async () => {

		function asyncCounter() {
			let count = 0;
			return async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
				return count >= 2 ? undefined : range(count++, count);
			};
		}

		const values = await iterate(asyncCounter())(toArray());

		expect(values).toEqual([0, 1]);

	});

	it("should handle async generators that terminate with undefined", async () => {

		let callCount = 0;
		const values = await iterate(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
			callCount++;
			return undefined;
		})(toArray());

		expect(values).toEqual([]);
		expect(callCount).toBe(1);

	});

	it("should handle async generators that terminate with empty array", async () => {

		let callCount = 0;
		const values = await iterate(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
			callCount++;
			return [];
		})(toArray());

		expect(values).toEqual([]);
		expect(callCount).toBe(1);

	});

	it("should handle mixed sync and async patterns", async () => {

		function mixedGenerator() {
			let count = 0;
			return async () => {
				if ( count === 0 ) {
					count++;
					return 0; // synchronous value
				} else if ( count === 1 ) {
					count++;
					await new Promise(resolve => setTimeout(resolve, 10));
					return 1; // async value
				} else if ( count === 2 ) {
					count++;
					return [2, 3]; // synchronous array
				} else {
					return undefined;
				}
			};
		}

		const values = await iterate(mixedGenerator())(toArray());

		expect(values).toEqual([0, 1, 2, 3]);

	});

	describe("should create a compliant pipe object", () => {

		it("should return async iterable when called without transform", async () => {
			function counter() {
				let count = 0;
				return () => count >= 3 ? undefined : [count++];
			}

			const values = await pipe(
				iterate(counter())
				(toArray())
			);
			expect(values).toEqual([0, 1, 2]);
		});

		it("should apply task and return new pipe", async () => {
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
