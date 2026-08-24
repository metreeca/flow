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
import { filter } from "../tasks/index.js";
import { avg } from "./avg.js";


describe("avg()", () => {

	it("should average all items in stream", async () => {

		const result = await items([1, 2, 3, 4])(avg());

		expect(result).toBe(2.5);

	});

	it("should return undefined for empty stream", async () => {

		const result = await items([] as number[])(avg());

		expect(result).toBeUndefined();

	});

	it("should return the only item of a singleton stream", async () => {

		const result = await items([42])(avg());

		expect(result).toBe(42);

	});

	it("should average negative items", async () => {

		const result = await items([-1, -2, -6])(avg());

		expect(result).toBe(-3);

	});

	it("should average items after filtering", async () => {

		const result = await items([1, 2, 3, 4, 5, 6])(filter(x => x%2 === 0))(avg());

		expect(result).toBe(4);

	});

	describe("with bigint items", () => {

		it("should average items dividing evenly", async () => {

			const result = await items([2n, 4n])(avg());

			expect(result).toBe(3n);

		});

		it("should round means down when the remainder falls below half", async () => {

			const result = await items([1n, 2n, 4n])(avg());

			expect(result).toBe(2n);

		});

		it("should round means up when the remainder rises above half", async () => {

			const result = await items([1n, 2n, 5n])(avg());

			expect(result).toBe(3n);

		});

		it("should round positive halves away from zero", async () => {

			const result = await items([1n, 2n])(avg());

			expect(result).toBe(2n);

		});

		it("should round negative halves away from zero", async () => {

			const result = await items([-1n, -2n])(avg());

			expect(result).toBe(-2n);

		});

		it("should average beyond the safe integer range", async () => {

			const result = await items([2n**64n, 2n**64n])(avg());

			expect(result).toBe(2n**64n);

		});

	});

	it("should report streams mixing number and bigint items", async () => {

		await expect(items([1, 2n])(avg())).rejects.toThrow(TypeError);

	});

});
