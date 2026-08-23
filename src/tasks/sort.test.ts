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

import { by, descending } from "@metreeca/core/order";
import { describe, expect, it } from "vitest";
import { items } from "../feeds/index.js";
import { toArray } from "../sinks/index.js";
import { sort } from "./sort.js";


describe("sort()", () => {

	it("should sort numbers in ascending order", async () => {

		const values = await items([3, 1, 4, 1, 5, 9, 2, 6])(sort())(toArray());

		expect(values).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);

	});

	it("should sort strings lexicographically", async () => {

		const values = await items(["cherry", "apple", "banana", "date"])(sort())(toArray());

		expect(values).toEqual(["apple", "banana", "cherry", "date"]);

	});

	it("should use selector to extract sort key", async () => {

		const values = await items([
			{ id: 3, name: "c" },
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		])(sort(by(item => item.id)))(toArray());

		expect(values).toEqual([
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 3, name: "c" }
		]);

	});

	it("should support custom comparators", async () => {

		const values = await items([
			{ id: 3, name: "c" },
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		])(sort((a, b) => a.id-b.id))(toArray());

		expect(values).toEqual([
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 3, name: "c" }
		]);

	});

	it("should sort in descending order", async () => {

		const values = await items([1, 2, 3, 4, 5])(sort(descending))(toArray());

		expect(values).toEqual([5, 4, 3, 2, 1]);

	});

	it("should use custom comparator for descending order", async () => {

		const values = await items([1, 2, 3, 4, 5])(sort((a, b) => b-a))(toArray());

		expect(values).toEqual([5, 4, 3, 2, 1]);

	});

	it("should combine selector with descending order", async () => {

		const values = await items([
			{ age: 30, name: "Alice" },
			{ age: 25, name: "Bob" },
			{ age: 35, name: "Charlie" }
		])(sort(by(item => item.age, descending)))(toArray());

		expect(values).toEqual([
			{ age: 35, name: "Charlie" },
			{ age: 30, name: "Alice" },
			{ age: 25, name: "Bob" }
		]);

	});

	it("should handle empty stream", async () => {

		const values = await items([] as number[])(sort())(toArray());

		expect(values).toEqual([]);

	});

	it("should handle single item", async () => {

		const values = await items([42])(sort())(toArray());

		expect(values).toEqual([42]);

	});

	it("should sort dates chronologically", async () => {

		const dates = [
			new Date("2023-03-15"),
			new Date("2023-01-10"),
			new Date("2023-02-20")
		];

		const values = await items(dates)(sort())(toArray());

		expect(values).toEqual([
			new Date("2023-01-10"),
			new Date("2023-02-20"),
			new Date("2023-03-15")
		]);

	});

	it("should sort booleans (false before true)", async () => {

		const values = await items([true, false, true, false])(sort())(toArray());

		expect(values).toEqual([false, false, true, true]);

	});

	it("should handle negative numbers", async () => {

		const values = await items([5, -3, 0, -1, 2])(sort())(toArray());

		expect(values).toEqual([-3, -1, 0, 2, 5]);

	});

	it("should be stable for equal elements", async () => {

		const values = await items([
			{ key: 2, value: "a" },
			{ key: 1, value: "b" },
			{ key: 2, value: "c" },
			{ key: 1, value: "d" }
		])(sort(by(item => item.key)))(toArray());

		// Items with same key should maintain relative order (stable sort)
		expect(values).toEqual([
			{ key: 1, value: "b" },
			{ key: 1, value: "d" },
			{ key: 2, value: "a" },
			{ key: 2, value: "c" }
		]);

	});

});
