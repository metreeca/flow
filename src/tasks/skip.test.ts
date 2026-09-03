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
import { skip } from "./skip.js";


describe("skip()", () => {

	it("should emit the items following the discarded prefix, in source order", async () => {

		const values = await items([1, 2, 3, 4, 5])(skip(2))(toArray());

		expect(values).toEqual([3, 4, 5]);

	});

	it("should emit nothing where the feed is shorter than the prefix", async () => {

		const values = await items([1, 2, 3])(skip(5))(toArray());

		expect(values).toEqual([]);

	});

	it.each([
		[0],
		[-5]
	])("should leave the feed untouched where the count is <%s>", async count => {

		const values = await items([1, 2, 3])(skip(count))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should discard a prefix of each run rather than of the feed as a whole", async () => {

		const source = items([1, 2, 3]);
		const task = skip<number>(1); // the same task, invoked once per run

		expect(await source(task)(toArray())).toEqual([2, 3]);
		expect(await source(task)(toArray())).toEqual([2, 3]);

	});

	it.each([
		[1.5],
		[NaN],
		[Infinity]
	])("should reject the non-integer count <%s>", async count => {

		expect(() => skip(count)).toThrow(TypeError);

	});

});
