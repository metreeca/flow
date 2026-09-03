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
import { max } from "./max.js";


describe("max()", () => {

	describe("with the default comparator", () => {

		it("should resolve to the greatest item in natural order", async () => {

			const result = await items([3, 1, 4, 1, 5])(max());

			expect(result).toBe(5);

		});

		it("should rank strings lexicographically", async () => {

			const result = await items(["cherry", "apple", "banana"])(max());

			expect(result).toBe("cherry");

		});

		it("should resolve to null only where the feed carries nothing else", async () => {

			expect(await items([2, null, 1])(max())).toBe(2);
			expect(await items([null])(max())).toBeNull();

		});

	});


	describe("with a custom comparator", () => {

		it("should rank items by an extracted key", async () => {

			const result = await items([{ id: 3 }, { id: 1 }, { id: 2 }])(max(by(item => item.id)));

			expect(result).toEqual({ id: 3 });

		});

		it("should rank items by an arbitrary criterion", async () => {

			const result = await items([{ id: 3 }, { id: 1 }, { id: 2 }])(max((a, b) => a.id-b.id));

			expect(result).toEqual({ id: 3 });

		});

		it("should invert the natural order with a descending comparator", async () => {

			const result = await items([3, 1, 4, 1, 5])(max(descending));

			expect(result).toBe(1);

		});

	});


	it("should resolve to the first of equally ranking items", async () => {

		const first = { key: 1, value: "a" };
		const other = { key: 1, value: "b" };

		const result = await items([first, other])(max(by(item => item.key)));

		expect(result).toBe(first);

	});

	it("should resolve to the only item of a singleton feed", async () => {

		const result = await items([42])(max());

		expect(result).toBe(42);

	});

	it("should resolve to undefined for an empty feed", async () => {

		const result = await items<number>([])(max());

		expect(result).toBeUndefined();

	});

});
