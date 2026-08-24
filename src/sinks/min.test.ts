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
import { items, range } from "../feeds/index.js";
import { filter, map } from "../tasks/index.js";
import { min } from "./min.js";


describe("min()", () => {

	it("should select the least item in stream", async () => {

		const result = await items([3, 1, 4, 1, 5])(min());

		expect(result).toBe(1);

	});

	it("should return undefined for empty stream", async () => {

		const result = await items([] as number[])(min());

		expect(result).toBeUndefined();

	});

	it("should return the only item of a singleton stream", async () => {

		const result = await items([42])(min());

		expect(result).toBe(42);

	});

	it("should select the least of negative and fractional items", async () => {

		const result = await items([1.5, -2.5, 3])(min());

		expect(result).toBe(-2.5);

	});

	it("should select the least item lexicographically", async () => {

		const result = await items(["cherry", "apple", "banana"])(min());

		expect(result).toBe("apple");

	});

	it("should select the least item after filtering", async () => {

		const result = await items([1, 2, 3, 4, 5, 6])(filter(x => x%2 === 0))(min());

		expect(result).toBe(2);

	});

	it("should select the least item after mapping", async () => {

		const result = await range(1, 5)(map(x => x*2))(min());

		expect(result).toBe(2);

	});

	describe("with a custom comparator", () => {

		it("should use selector to extract ranking key", async () => {

			const result = await items([
				{ id: 3, name: "c" },
				{ id: 1, name: "a" },
				{ id: 2, name: "b" }
			])(min(by(item => item.id)));

			expect(result).toEqual({ id: 1, name: "a" });

		});

		it("should support custom comparators", async () => {

			const result = await items([
				{ id: 3, name: "c" },
				{ id: 1, name: "a" },
				{ id: 2, name: "b" }
			])(min((a, b) => a.id-b.id));

			expect(result).toEqual({ id: 1, name: "a" });

		});

		it("should invert ranking with a descending comparator", async () => {

			const result = await items([3, 1, 4, 1, 5])(min(descending));

			expect(result).toBe(5);

		});

	});

	it("should select the first of equally ranking items", async () => {

		const first = { key: 1, value: "a" };
		const other = { key: 1, value: "b" };

		const result = await items([first, other])(min(by(item => item.key)));

		expect(result).toBe(first);

	});

});
