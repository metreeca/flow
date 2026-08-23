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
import { filter } from "./filter.js";
import { take } from "./take.js";


describe("take()", () => {

	it("should take first n items", async () => {

		const values = await items([1, 2, 3, 4, 5])(take(3))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should take all items when n >= length", async () => {

		const values = await items([1, 2, 3])(take(5))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should take zero items", async () => {

		const values = await items([1, 2, 3])(take(0))(toArray());

		expect(values).toEqual([]);

	});

	it("should treat negative n as zero", async () => {

		const values = await items([1, 2, 3])(take(-5))(toArray());

		expect(values).toEqual([]);

	});

	it("should terminate infinite generator after n items", async () => {

		let generatorCalls = 0;
		let iteratorReturned = false;

		// Create an infinite generator that tracks cleanup
		const infiniteGenerator = items((async function* () {
			try {
				let i = 0;
				while ( true ) {
					generatorCalls++;
					yield i++;
				}
			} finally {
				iteratorReturned = true;
			}
		})());

		const values = await infiniteGenerator(take(5))(toArray());

		expect(values).toEqual([0, 1, 2, 3, 4]);
		expect(generatorCalls).toBe(6); // Called 6 times: yields 0-4, then one more call before return
		expect(iteratorReturned).toBe(true); // Generator was properly cleaned up

	});

	it("should backsignal through intermediate tasks", async () => {

		let generatorCalls = 0;
		let iteratorReturned = false;

		// Create an infinite generator that tracks cleanup
		const infiniteGenerator = items((async function* () {
			try {
				let i = 0;
				while ( true ) {
					generatorCalls++;
					yield i++;
				}
			} finally {
				iteratorReturned = true;
			}
		})());

		// Pipeline: infinite generator > filter (evens) > take(3)
		const values = await infiniteGenerator
		(filter(x => x%2 === 0))
		(take(3))
		(toArray());

		expect(values).toEqual([0, 2, 4]);
		// Generator yields: 0(✓), 1(✗), 2(✓), 3(✗), 4(✓), 5(✗), 6(passes filter, triggers take return)
		expect(generatorCalls).toBe(7); // 7 calls: take needs one more to detect count >= 3
		expect(iteratorReturned).toBe(true); // Generator was properly cleaned up

	});

});
