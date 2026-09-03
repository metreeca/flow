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
import { sum } from "./sum.js";


describe("sum()", () => {

	describe("with number items", () => {

		it("should resolve to the total of the items", async () => {

			const result = await items([1, 2, 3, 4, 5])(sum());

			expect(result).toBe(15);

		});

		it("should add negative and fractional items", async () => {

			const result = await items([1.5, -2.5, 3])(sum());

			expect(result).toBe(2);

		});

	});


	describe("with bigint items", () => {

		it("should resolve to the total of the items", async () => {

			const result = await items([1n, 2n, 3n])(sum());

			expect(result).toBe(6n);

		});

		it("should add beyond the safe integer range", async () => {

			const result = await items([2n**64n, 1n])(sum());

			expect(result).toBe(2n**64n+1n);

		});

	});


	it("should resolve to the only item of a singleton feed", async () => {

		const result = await items([42])(sum());

		expect(result).toBe(42);

	});

	it("should resolve to undefined for an empty feed", async () => {

		const result = await items<number>([])(sum());

		expect(result).toBeUndefined();

	});

	it("should report feeds mixing number and bigint items", async () => {

		await expect(items<number | bigint>([1, 2n])(sum())).rejects.toThrow(TypeError);

	});

});
