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
import { items } from "../feeds/index.js";
import { avg } from "./avg.js";


describe("avg()", () => {

	describe("with number items", () => {

		it("should resolve to the fractional mean of the items", async () => {

			const result = await items([1, 2, 3, 4])(avg());

			expect(result).toBe(2.5);

		});

		it("should average negative items", async () => {

			const result = await items([-1, -2, -6])(avg());

			expect(result).toBe(-3);

		});

	});


	describe("with bigint items", () => {

		it("should resolve to the exact mean where the items divide evenly", async () => {

			const result = await items([2n, 4n])(avg());

			expect(result).toBe(3n);

		});

		it.each([
			[[1n, 2n, 4n], 2n], // remainder below half, rounded down
			[[1n, 2n, 5n], 3n], // remainder above half, rounded up
			[[1n, 2n], 2n],     // positive half, rounded away from zero
			[[-1n, -2n], -2n]   // negative half, rounded away from zero
		])("should round the mean of %s to the nearest integer", async (values, expected) => {

			const result = await items(values)(avg());

			expect(result).toBe(expected);

		});

		it("should average beyond the safe integer range", async () => {

			const result = await items([2n**64n, 2n**64n])(avg());

			expect(result).toBe(2n**64n);

		});

	});


	it("should resolve to the only item of a singleton feed", async () => {

		const result = await items([42])(avg());

		expect(result).toBe(42);

	});

	it("should resolve to undefined for an empty feed", async () => {

		const result = await items<number>([])(avg());

		expect(result).toBeUndefined();

	});

	it("should report feeds mixing number and bigint items", async () => {

		await expect(items<number | bigint>([1, 2n])(avg())).rejects.toThrow(TypeError);

	});

});
