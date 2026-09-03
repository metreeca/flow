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
import { inlet, items } from "../feeds/index.js";
import { pipe } from "../index.js";
import { toArray } from "../sinks/index.js";
import { batch } from "./batch.js";
import { take } from "./take.js";


describe("batch()", () => {

	it("should emit the items in fixed-size batches, in source order", async () => {

		const values = await items([1, 2, 3, 4, 5, 6])(batch(2))(toArray());

		expect(values).toEqual([[1, 2], [3, 4], [5, 6]]);

	});

	it("should emit a short final batch where the feed ends before it fills up", async () => {

		const values = await items([1, 2, 3])(batch(2))(toArray());

		expect(values).toEqual([[1, 2], [3]]);

	});

	it("should emit one batch per item where the size is 1", async () => {

		const values = await items([1, 2, 3])(batch(1))(toArray());

		expect(values).toEqual([[1], [2], [3]]);

	});

	it.each([
		[undefined],
		[0],
		[-5]
	])("should collect the whole feed into a single batch where the size is <%s>", async size => {

		const values = await items([1, 2, 3])(batch(size))(toArray());

		expect(values).toEqual([[1, 2, 3]]);

	});

	it("should emit nothing for an empty feed", async () => {

		const values = await items<number>([])(batch(2))(toArray());

		expect(values).toEqual([]);

	});

	it("should emit batches as they fill up", async () => {

		const count = { next: 0 };

		const values = await pipe( // an infinite feed completes, as the batches downstream fill up before it runs dry
			(inlet(() => count.next++))
			(batch(2))
			(take(2))
			(toArray())
		);

		expect(values).toEqual([[0, 1], [2, 3]]);

	});

	it("should close every run with a short batch rather than filling it from the run that follows", async () => {

		const source = items([1, 2, 3]);
		const task = batch<number>(2); // the same task, invoked once per run

		expect(await source(task)(toArray())).toEqual([[1, 2], [3]]);
		expect(await source(task)(toArray())).toEqual([[1, 2], [3]]);

	});

	it.each([
		[1.5],
		[NaN],
		[Infinity]
	])("should reject the non-integer size <%s>", async size => {

		expect(() => batch(size)).toThrow(TypeError);

	});

});
