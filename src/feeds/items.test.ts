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
import { toArray } from "../sinks/index.js";
import { filter, map } from "../tasks/index.js";
import { items } from "./items.js";


describe("items()", () => {

	it("should create feed from multiple values", async () => {

		const result = await items(1, 2, 3, 4)(toArray());

		expect(result).toEqual([1, 2, 3, 4]);

	});

	it("should create feed from a single value", async () => {

		const result = await items(42)(toArray());

		expect(result).toEqual([42]);

	});

	it("should create an empty feed from an empty argument list", async () => {

		const result = await items<number>()(toArray());

		expect(result).toEqual([]);

	});

	it("should create feed from mixed values", async () => {

		const result = await items<number | string>(1, "a", 2, "b")(toArray());

		expect(result).toEqual([1, "a", 2, "b"]);

	});

	it("should compose with tasks and sinks", async () => {

		const result = await pipe(
			items(1, 2, 3, 4, 5)
			(filter(x => x%2 === 0))
			(map(x => x*2))
			(toArray())
		);

		expect(result).toEqual([4, 8]);

	});

	describe("should contribute values as they are", () => {

		it("should yield arrays whole rather than expanding them", async () => {

			const result = await items([1, 2], [3, 4])(toArray());

			expect(result).toEqual([[1, 2], [3, 4]]);

		});

		it("should yield a lone array whole rather than expanding it", async () => {

			const result = await items([1, 2, 3])(toArray());

			expect(result).toEqual([[1, 2, 3]]);

		});

		it("should yield iterables whole rather than expanding them", async () => {

			const result = await items(new Set([1, 2]), new Set([3, 4]))(toArray());

			expect(result).toEqual([new Set([1, 2]), new Set([3, 4])]);

		});

		it("should yield strings whole", async () => {

			const result = await items("hello", "")(toArray());

			expect(result).toEqual(["hello", ""]);

		});

	});

	describe("should filter undefined values", () => {

		it("should drop undefined arguments", async () => {

			const result = await items<number | undefined>(1, undefined, 2, undefined, 3)(toArray());

			expect(result).toEqual([1, 2, 3]);

		});

		it("should drop a lone undefined argument", async () => {

			const result = await items(undefined)(toArray());

			expect(result).toEqual([]);

		});

		it("should preserve falsy values that are not undefined", async () => {

			const result = await items<number | boolean | string | null | undefined>(
				0, false, "", null, undefined
			)(toArray());

			expect(result).toEqual([0, false, "", null]);

		});

	});

});
