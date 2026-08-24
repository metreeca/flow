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
import { toArray } from "../sinks/index.js";
import { batch } from "./batch.js";
import { map } from "./map.js";


describe("batch()", () => {

	it("should group items into batches of specified size", async () => {

		const values = await items(1, 2, 3, 4, 5)(batch(2))(toArray());

		expect(values).toEqual([[1, 2], [3, 4], [5]]);

	});

	it("should collect all items when size is 0", async () => {

		const values = await items(1, 2, 3, 4, 5)(batch(0))(toArray());

		expect(values).toEqual([[1, 2, 3, 4, 5]]);

	});

	it("should handle empty stream", async () => {

		const values = await items<number>()(batch(2))(toArray());

		expect(values).toEqual([]);

	});

	it("should yield final partial batch", async () => {

		const values = await items(1, 2, 3)(batch(2))(toArray());

		expect(values).toEqual([[1, 2], [3]]);

	});

	it("should create individual batches when size is 1", async () => {

		const values = await items(1, 2, 3, 4)(batch(1))(toArray());

		expect(values).toEqual([[1], [2], [3], [4]]);

	});

	it("should process batches through pipeline", async () => {

		const result = await items(1, 2, 3, 4, 5, 6, 7)
		(batch(3))
		(map(batch => batch.reduce((sum, n) => sum+n, 0)))
		(toArray());

		expect(result).toEqual([6, 15, 7]);

	});

	it("should reject non-integer size", () => {

		expect(() => batch(1.5)).toThrow(TypeError);
		expect(() => batch(NaN)).toThrow(TypeError);
		expect(() => batch(Infinity)).toThrow(TypeError);

	});

});
