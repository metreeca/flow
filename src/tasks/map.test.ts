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
import { map } from "./map.js";
import { take } from "./take.js";


describe("map()", () => {

	it("should convert the items in source order", async () => {

		const values = await items([1, 2, 3])(map(x => x*2))(toArray());

		expect(values).toEqual([2, 4, 6]);

	});

	it("should convert the items into a new type", async () => {

		const values = await items([1, 2, 3])(map(x => `value-${x}`))(toArray());

		expect(values).toEqual(["value-1", "value-2", "value-3"]);

	});

	it("should await asynchronous mappers", async () => {

		const values = await items([1, 2, 3])(map(async x => {
			await Promise.resolve();
			return x*2;
		}))(toArray());

		expect(values).toEqual([2, 4, 6]);

	});

	it("should carry falsy results", async () => {

		const values = await items([1, 2, 3, 4])(map(x => x%2 === 0 ? x*2 : undefined))(toArray());

		expect(values).toEqual([undefined, 4, undefined, 8]);

	});

	it("should emit items as they are drawn", async () => {

		const count = { next: 0 };

		const values = await pipe( // an infinite feed completes, as the quota downstream is met before it runs dry
			(inlet(() => count.next++))
			(map(x => x*2))
			(take(3))
			(toArray())
		);

		expect(values).toEqual([0, 2, 4]);

	});

	it("should emit nothing for an empty feed", async () => {

		const values = await items<number>([])(map(x => x*2))(toArray());

		expect(values).toEqual([]);

	});

	it("should propagate mapper failures", async () => {

		await expect(items([1, 2, 3])(map(x => {
			if ( x === 2 ) { throw new Error("mapper failed"); }
			return x*2;
		}))(toArray())).rejects.toThrow("mapper failed");

	});

});
