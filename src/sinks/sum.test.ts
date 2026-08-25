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
import { items, range } from "../feeds/index.js";
import { filter, map } from "../tasks/index.js";
import { sum } from "./sum.js";


describe("sum()", () => {

	it("should sum all items in feed", async () => {

		const result = await items(1, 2, 3, 4, 5)(sum());

		expect(result).toBe(15);

	});

	it("should return undefined for empty feed", async () => {

		const result = await items<number>()(sum());

		expect(result).toBeUndefined();

	});

	it("should return the only item of a singleton feed", async () => {

		const result = await items(42)(sum());

		expect(result).toBe(42);

	});

	it("should sum negative and fractional items", async () => {

		const result = await items(1.5, -2.5, 3)(sum());

		expect(result).toBe(2);

	});

	it("should sum items after filtering", async () => {

		const result = await items(1, 2, 3, 4, 5, 6)(filter(x => x%2 === 0))(sum());

		expect(result).toBe(12);

	});

	it("should sum items after mapping", async () => {

		const result = await range(1, 5)(map(x => x*2))(sum());

		expect(result).toBe(20);

	});

	describe("with bigint items", () => {

		it("should sum all items in feed", async () => {

			const result = await items(1n, 2n, 3n)(sum());

			expect(result).toBe(6n);

		});

		it("should sum beyond the safe integer range", async () => {

			const result = await items(2n**64n, 1n)(sum());

			expect(result).toBe(2n**64n+1n);

		});

	});

	it("should report feeds mixing number and bigint items", async () => {

		await expect(items<number | bigint>(1, 2n)(sum())).rejects.toThrow(TypeError);

	});

});
