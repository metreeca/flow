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

import { sleep } from "@metreeca/core/async";
import { describe, expect, it } from "vitest";
import { pipe } from "../index.js";
import { find, toArray } from "../sinks/index.js";
import { take } from "../tasks/index.js";
import { done, inlet } from "./inlet.js";


/**
 * Creates a source reporting consecutive integers from 0, one per call.
 */
function counter(): () => number {

	const count = { next: 0 };

	return () => count.next++;

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("inlet()", () => {

	it("should draw one value per call", async () => {

		const values = await pipe(
			(inlet(counter()))
			(take(3))
			(toArray())
		);

		expect(values).toEqual([0, 1, 2]);

	});

	it("should await a promised value before contributing it", async () => {

		const count = counter();

		const values = await pipe(
			(inlet(async () => {
				await sleep(10);
				return count();
			}))
			(take(3))
			(toArray())
		);

		expect(values).toEqual([0, 1, 2]);

	});

	it("should run on unless the source or the signal ends it", async () => {

		const value = await pipe(
			(inlet(counter()))
			(find(value => value === 3))
		);

		expect(value).toBe(3);

	});

	it("should run dry after the first pass", async () => {

		const source = inlet(counter());

		expect(await source(take(3))(toArray())).toEqual([0, 1, 2]);
		expect(await source(take(3))(toArray())).toEqual([]);

	});

	it("should compose as a feed bounded at the iteration site", async () => {

		const values: number[] = [];

		for await (const value of inlet(counter())) {

			values.push(value);

			if ( values.length === 3 ) { break; } // bounds the infinite feed at the iteration site

		}

		expect(values).toEqual([0, 1, 2]);

	});


	describe("ending where the source reports done", () => {

		it("should withhold the marker from the items", async () => {

			const count = counter();

			const values = await inlet(() => {

				const value = count();

				return value < 3 ? value : done;

			})(toArray());

			expect(values).toEqual([0, 1, 2]);

		});

		it("should open an empty feed where the first call reports done", async () => {

			const values = await inlet(() => done)(toArray());

			expect(values).toEqual([]);

		});

	});


	describe("ending on an aborted signal", () => {

		it("should open an empty feed where the signal is already aborted", async () => {

			const values = await inlet(counter(), AbortSignal.abort())(toArray());

			expect(values).toEqual([]);

		});

		it("should keep the items contributed before the signal is aborted", async () => {

			const controller = new AbortController();
			const count = counter();

			const values = await inlet(() => {

				const value = count();

				if ( value === 2 ) { controller.abort(); } // bounds the feed once it is under way

				return value;

			}, controller.signal)(toArray());

			expect(values).toEqual([0, 1, 2]);

		});

		it("should contribute a promised value in flight when the signal is aborted", async () => {

			const controller = new AbortController();
			const count = counter();

			const values = await inlet(async () => {

				const value = count();

				if ( value === 1 ) { controller.abort(); } // aborted while the value is still in flight

				await sleep(10);

				return value;

			}, controller.signal)(toArray());

			expect(values).toEqual([0, 1]);
			expect(controller.signal.aborted).toBeTruthy(); // the outcome is partial rather than complete

		});

		it("should leave the feed unaffected while the signal is not aborted", async () => {

			const values = await pipe(
				(inlet(counter(), new AbortController().signal))
				(take(3))
				(toArray())
			);

			expect(values).toEqual([0, 1, 2]);

		});

	});


	describe("contributing values as they are", () => {

		it("should preserve falsy values", async () => {

			const falsy = [0, false, "", null, undefined];
			const index = { next: 0 };

			const values = await pipe(
				(inlet(() => falsy[index.next++]))
				(take(falsy.length))
				(toArray())
			);

			expect(values).toEqual([0, false, "", null, undefined]);

		});

		it("should contribute strings as atomic values", async () => {

			const count = counter();

			const values = await pipe(
				(inlet(() => `value${count()}`))
				(take(2))
				(toArray())
			);

			expect(values).toEqual(["value0", "value1"]);

		});

		it("should contribute arrays without expanding them", async () => {

			const pages = [[1, 2], [3, 4]];
			const index = { next: 0 };

			const values = await pipe(
				(inlet(() => pages[index.next++]))
				(take(2))
				(toArray())
			);

			expect(values).toEqual([[1, 2], [3, 4]]);

		});

		it("should contribute empty arrays rather than end the feed", async () => {

			const values = await pipe(
				(inlet(() => []))
				(take(2))
				(toArray())
			);

			expect(values).toEqual([[], []]);

		});

		it("should contribute iterables without expanding them", async () => {

			const values = await pipe(
				(inlet(() => new Set([1, 2])))
				(take(1))
				(toArray())
			);

			expect(values).toEqual([new Set([1, 2])]);

		});

	});

});
