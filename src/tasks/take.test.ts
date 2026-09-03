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
import { Feed } from "../index.js";
import { toArray } from "../sinks/index.js";
import { filter } from "./filter.js";
import { take } from "./take.js";


/**
 * Creates an endless feed, reporting how many items it was drawn for and whether it was closed.
 */
function endless(): {

	readonly feed: Feed<number>,
	readonly drawn: () => number,
	readonly closed: () => boolean

} {

	const draws = { count: 0, closed: false };

	return {

		feed: items((async function* () {

			try {

				const value = { next: 0 };

				while ( true ) {
					draws.count++;
					yield value.next++;
				}

			} finally {

				draws.closed = true;

			}

		})()),

		drawn: () => draws.count,
		closed: () => draws.closed

	};

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("take()", () => {

	it("should emit the leading items, in source order", async () => {

		const values = await items([1, 2, 3, 4, 5])(take(3))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should emit the whole feed where it is shorter than the quota", async () => {

		const values = await items([1, 2, 3])(take(5))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it.each([
		[0],
		[-5]
	])("should empty the feed where the quota is <%s>", async quota => {

		const values = await items([1, 2, 3])(take(quota))(toArray());

		expect(values).toEqual([]);

	});

	it("should grant its quota to each run rather than to the feed as a whole", async () => {

		const source = items([1, 2, 3]);
		const task = take<number>(2); // the same task, invoked once per run

		expect(await source(task)(toArray())).toEqual([1, 2]);
		expect(await source(task)(toArray())).toEqual([1, 2]);

	});

	it("should end an infinite feed at the quota, closing the source", async () => {

		const source = endless();

		const values = await source.feed(take(5))(toArray());

		expect(values).toEqual([0, 1, 2, 3, 4]);
		expect(source.drawn()).toBe(6); // the quota, plus the draw the end is detected on
		expect(source.closed()).toBeTruthy();

	});

	it("should end an infinite feed through intermediate tasks", async () => {

		const source = endless();

		const values = await source.feed
		(filter(x => x%2 === 0))
		(take(3))
		(toArray());

		expect(values).toEqual([0, 2, 4]);
		expect(source.drawn()).toBe(7); // the six items the filter drew for the quota, plus the detecting draw
		expect(source.closed()).toBeTruthy();

	});

	it.each([
		[1.5],
		[NaN],
		[Infinity]
	])("should reject the non-integer quota <%s>", async quota => {

		expect(() => take(quota)).toThrow(TypeError);

	});

});
