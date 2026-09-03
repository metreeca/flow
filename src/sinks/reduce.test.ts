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
import { reduce } from "./reduce.js";


describe("reduce()", () => {

	describe("without an initial value", () => {

		it("should seed the accumulator with the first item", async () => {

			const total = await items([1, 2, 3, 4])(reduce((acc, x) => acc+x));

			expect(total).toBe(10);

		});

		it("should resolve to the only item of a singleton feed, without folding it", async () => {

			const folds = { count: 0 };

			const total = await items([42])(reduce((acc, x) => {
				folds.count++;
				return acc+x;
			}));

			expect(total).toBe(42);
			expect(folds.count).toBe(0);

		});

		it("should resolve to undefined for an empty feed", async () => {

			const total = await items<number>([])(reduce((acc, x) => acc+x));

			expect(total).toBeUndefined();

		});

	});


	describe("with an initial value", () => {

		it("should seed the accumulator with the initial value", async () => {

			const total = await items([1, 2, 3, 4])(reduce((acc, x) => acc+x, 10));

			expect(total).toBe(20);

		});

		it("should fold the items into a value of a different type", async () => {

			const report = await items([1, 2, 3])(reduce<number, string>((acc, x) => `${acc}${x}`, "#"));

			expect(report).toBe("#123");

		});

		it("should resolve to the initial value for an empty feed", async () => {

			const total = await items<number>([])(reduce((acc, x) => acc+x, 100));

			expect(total).toBe(100);

		});

	});


	it("should await asynchronous reducers", async () => {

		const total = await items([1, 2, 3])(reduce(async (acc, x) => {
			await Promise.resolve();
			return acc+x;
		}, 0));

		expect(total).toBe(6);

	});

	it("should propagate reducer failures", async () => {

		await expect(items([1, 2, 3])(reduce((acc, x) => {
			if ( x === 2 ) { throw new Error("reducer failed"); }
			return acc+x;
		}, 0))).rejects.toThrow("reducer failed");

	});

});
