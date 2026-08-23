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
import { some } from "./some.js";


describe("some()", () => {

	it("should return true when any item matches", async () => {

		const result = await items([1, 2, 3, 4])(some(x => x > 3));

		expect(result).toBe(true);

	});

	it("should return false when no items match", async () => {

		const result = await items([1, 2, 3])(some(x => x > 10));

		expect(result).toBe(false);

	});

	it("should support async predicates", async () => {

		const result = await items([1, 2, 3])(some(async x => {
			await Promise.resolve();
			return x === 2;
		}));

		expect(result).toBe(true);

	});

	it("should terminate infinite generator when match found", async () => {

		let generatorCalls = 0;
		let iteratorReturned = false;

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

		const result = await infiniteGenerator(some(x => x > 5));

		expect(result).toBe(true);
		expect(generatorCalls).toBe(7); // Checked items 0-6 (6 is first > 5)
		expect(iteratorReturned).toBe(true); // Generator was properly cleaned up

	});

});
