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
import { feed, items } from "../feeds/index.js";
import { pipe } from "../index.js";
import { toArray } from "../sinks/index.js";
import { flatMap } from "./flatMap.js";
import { map } from "./map.js";


describe("flatMap()", () => {

	it("should flatten mapped async iterables", async () => {

		const values = await items(1, 2, 3)(flatMap(async function* (x) {
			yield x;
			yield x*10;
		}))(toArray());

		expect(values).toEqual([1, 10, 2, 20, 3, 30]);

	});

	it("should flatten mapped arrays", async () => {

		const values = await items(1, 2, 3)(flatMap(x => [x, x*2]))(toArray());

		expect(values).toEqual([1, 2, 2, 4, 3, 6]);

	});

	it("should reject single values", () => {

		// @ts-expect-error single values are contributed by wrapping them in a batch

		flatMap((x: number) => x*2);

	});

	it("should reject undefined", () => {

		// @ts-expect-error nothing is contributed by an empty batch

		flatMap(() => undefined);

	});

	it("should flatten nested feeds", async () => {

		const values = await items(1, 2)(flatMap(x => pipe(
			feed([x])
			(map(v => v*2))
		)))(toArray());

		expect(values).toEqual([2, 4]);

	});

	it("should handle empty iterables", async () => {

		const values = await items(1, 2, 3)(flatMap(async function* (x) {
			if ( x === 2 ) {
				yield x;
			}
		}))(toArray());

		expect(values).toEqual([2]);

	});

	it("should treat returned strings as atomic values", async () => {

		const values = await items(1, 2, 3)(flatMap(x => `value${x}`))(toArray());

		expect(values).toEqual(["value1", "value2", "value3"]);

	});

	it("should treat strings in arrays as items to yield", async () => {

		const values = await items(1, 2)(flatMap(x => [`a${x}`, `b${x}`]))(toArray());

		expect(values).toEqual(["a1", "b1", "a2", "b2"]);

	});

	it("should propagate mapper errors", async () => {

		await expect(items(1, 2, 3)(flatMap(x => {
			if ( x === 2 ) { throw new Error("mapper failed"); }
			return [x, x*2];
		}))(toArray())).rejects.toThrow("mapper failed");

	});

	it("should propagate errors thrown while flattening", async () => {

		await expect(items(1, 2, 3)(flatMap(x => (function* () {
			yield x;
			if ( x === 2 ) { throw new Error("flatten failed"); }
			yield x*2;
		})()))(toArray())).rejects.toThrow("flatten failed");

	});

	it("should handle an empty source", async () => {

		const values = await items<number>()(flatMap(x => [x, x*2]))(toArray());

		expect(values).toEqual([]);

	});

});
