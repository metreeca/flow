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
import { forEach } from "./forEach.js";


describe("forEach()", () => {

	it("should execute consumer for each item", async () => {

		const sideEffects: number[] = [];

		const count = await items([1, 2, 3])(forEach(x => {
			sideEffects.push(x);
		}));

		expect(sideEffects).toEqual([1, 2, 3]);
		expect(count).toBe(3);

	});

	it("should support async consumers", async () => {

		const sideEffects: number[] = [];

		const count = await items([1, 2, 3])(forEach(async x => {
			await Promise.resolve();
			sideEffects.push(x*2);
		}));

		expect(sideEffects).toEqual([2, 4, 6]);
		expect(count).toBe(3);

	});

	it("should handle empty stream", async () => {

		const sideEffects: number[] = [];

		const count = await items([] as number[])(forEach(x => {
			sideEffects.push(x);
		}));

		expect(sideEffects).toEqual([]);
		expect(count).toBe(0);

	});

});
