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
import { pipe } from "../index.js";
import { toArray } from "../sinks/index.js";
import { map } from "../tasks/index.js";
import { range } from "./range.js";


describe("range()", () => {

	it("should yield the numbers from the lower bound towards the greater one", async () => {

		const values = await range(1, 5)(toArray());

		expect(values).toEqual([1, 2, 3, 4]);

	});

	it("should yield the numbers from the greater bound down towards the lower one", async () => {

		const values = await range(5, 1)(toArray());

		expect(values).toEqual([5, 4, 3, 2]);

	});

	it("should exclude the bound the range stops at", async () => {

		const values = await range(-2, 2)(toArray());

		expect(values).toEqual([-2, -1, 0, 1]);

	});

	it("should yield nothing for equal bounds", async () => {

		const values = await range(3, 3)(toArray());

		expect(values).toEqual([]);

	});

	it("should run dry after the first pass", async () => {

		const source = range(1, 4);

		expect(await source(toArray())).toEqual([1, 2, 3]);
		expect(await source(toArray())).toEqual([]);

	});

	it("should compose as a feed", async () => {

		const values = await pipe(range(1, 4)(map(x => x*2))(toArray()));

		expect(values).toEqual([2, 4, 6]);

	});

	it.each([
		[1.5, 4],
		[1, 4.5],
		[NaN, 4],
		[1, Infinity]
	])("should reject the non-integer bounds <%s, %s>", async (start, end) => {

		expect(() => range(start, end)).toThrow(TypeError);

	});

});
