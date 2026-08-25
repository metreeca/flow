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

	it("should reduce with initial value", async () => {

		const sum = await items(1, 2, 3, 4)(reduce((acc, x) => acc+x, 0));

		expect(sum).toBe(10);

	});

	it("should reduce without initial value", async () => {

		const sum = await items(1, 2, 3, 4)(reduce((acc, x) => acc+x));

		expect(sum).toBe(10);

	});

	it("should return undefined for empty feed without initial", async () => {

		const result = await items<number>()(reduce((acc, x) => acc+x));

		expect(result).toBeUndefined();

	});

	it("should return initial for empty feed with initial", async () => {

		const result = await items<number>()(reduce((acc, x) => acc+x, 100));

		expect(result).toBe(100);

	});

	it("should support async reducers", async () => {

		const sum = await items(1, 2, 3)(reduce(async (acc, x) => {
			await Promise.resolve();
			return acc+x;
		}, 0));

		expect(sum).toBe(6);

	});

});
