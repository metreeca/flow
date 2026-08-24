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
import { data, items } from "../feeds/index.js";
import { find } from "./find.js";


describe("find()", () => {

	it("should find first matching item", async () => {

		const result = await items(1, 2, 3, 4, 5)(find(x => x > 2));

		expect(result).toBe(3);

	});

	it("should return undefined when no match", async () => {

		const result = await items(1, 2, 3)(find(x => x > 10));

		expect(result).toBeUndefined();

	});

	it("should support async predicates", async () => {

		const result = await items(1, 2, 3, 4)(find(async x => {
			await Promise.resolve();
			return x === 3;
		}));

		expect(result).toBe(3);

	});

	it("should terminate infinite generator when match found", async () => {

		let generatorCalls = 0;
		let iteratorReturned = false;

		const infiniteGenerator = data((async function* () {
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

		const result = await infiniteGenerator(find(x => x === 3));

		expect(result).toBe(3);
		expect(generatorCalls).toBe(4); // Checked items 0, 1, 2, 3
		expect(iteratorReturned).toBe(true); // Generator was properly cleaned up

	});

});
