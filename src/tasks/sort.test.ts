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

	describe("with the default comparator", () => {

		it("should emit the items in natural order", async () => {

			const values = await items([3, 1, 4, 1, 5])(sort())(toArray());

			expect(values).toEqual([1, 1, 3, 4, 5]);

		});

		it("should rank null before any other value", async () => {

			const values = await items([2, null, 1])(sort())(toArray());

			expect(values).toEqual([null, 1, 2]);

		});

	});


	describe("with a custom comparator", () => {

		it("should emit the items in comparator order", async () => {

			const values = await items([1, 2, 3])(sort((a, b) => b-a))(toArray());

			expect(values).toEqual([3, 2, 1]);

		});

		it("should invert the natural order with a descending comparator", async () => {

			const values = await items([3, 1, 2])(sort(descending))(toArray());

			expect(values).toEqual([3, 2, 1]);

		});

		it("should rank items by an extracted key", async () => {

			const values = await items([{ id: 3 }, { id: 1 }, { id: 2 }])(sort(by(item => item.id)))(toArray());

			expect(values).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);

		});

	});


	it("should keep equally ranking items in source order", async () => {

		const values = await items([
			{ key: 2, value: "a" },
			{ key: 1, value: "b" },
			{ key: 2, value: "c" },
			{ key: 1, value: "d" }
		])(sort(by(item => item.key)))(toArray());

		expect(values).toEqual([
			{ key: 1, value: "b" },
			{ key: 1, value: "d" },
			{ key: 2, value: "a" },
			{ key: 2, value: "c" }
		]);

	});

	it("should emit nothing for an empty feed", async () => {

		const values = await items<number>([])(sort())(toArray());

		expect(values).toEqual([]);

	});

	it("should order each run independently rather than the feed as a whole", async () => {

		const source = items([3, 1, 2]);
		const task = sort<number>(); // the same task, invoked once per run

		expect(await source(task)(toArray())).toEqual([1, 2, 3]);
		expect(await source(task)(toArray())).toEqual([1, 2, 3]);

	});

});
