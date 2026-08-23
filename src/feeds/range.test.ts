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
import { range } from "./range.js";


describe("range()", () => {

	it("should generate ascending range", async () => {

		const values = await range(1, 5)(toArray());

		expect(values).toEqual([1, 2, 3, 4]);

	});

	it("should generate descending range", async () => {

		const values = await range(5, 1)(toArray());

		expect(values).toEqual([5, 4, 3, 2]);

	});

	it("should generate empty range when start equals end", async () => {

		const values = await range(3, 3)(toArray());

		expect(values).toEqual([]);

	});

	it("should work with negative numbers", async () => {

		const values = await range(-2, 2)(toArray());

		expect(values).toEqual([-2, -1, 0, 1]);

	});

	describe("should create a compliant pipe object", () => {

		it("should return async iterable when called without transform", async () => {
			expect(await pipe(range(1, 4)(toArray()))).toEqual([1, 2, 3]);
		});

		it("should apply task and return new pipe", async () => {
			expect(await pipe(range(1, 4)(map(x => x*2))(toArray()))).toEqual([2, 4, 6]);
		});

		it("should apply sink and return promise", async () => {
			expect(await range(1, 4)(reduce((acc, x) => acc+x, 0))).toBe(6);
		});

		it("should chain multiple tasks", async () => {
			expect(await pipe(
				range(1, 6)
				(filter(x => x%2 === 0))
				(map(x => x*2))
				(toArray())
			)).toEqual([4, 8]);
		});

	});

});
