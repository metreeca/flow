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
import { every } from "./every.js";


describe("every()", () => {

	it("should return true when all items match", async () => {

		const result = await items(1, 2, 3, 4)(every(x => x > 0));

		expect(result).toBe(true);

	});

	it("should return false when any item doesn't match", async () => {

		const result = await items(1, 2, 3, 4)(every(x => x < 3));

		expect(result).toBe(false);

	});

	it("should support async predicates", async () => {

		const result = await items(1, 2, 3)(every(async x => {
			await Promise.resolve();
			return x > 0;
		}));

		expect(result).toBe(true);

	});

	it("should terminate infinite generator when predicate fails", async () => {

		let generatorCalls = 0;
		let iteratorReturned = false;

		const infiniteGenerator = feed((async function* () {
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

		const result = await infiniteGenerator(every(x => x < 5));

		expect(result).toBe(false);
		expect(generatorCalls).toBe(6); // Checked items 0-5 (5 is first that fails x < 5)
		expect(iteratorReturned).toBe(true); // Generator was properly cleaned up

	});

	it("should return true for empty feed", async () => {

		const result = await items<number>()(every(x => x > 10));

		expect(result).toBe(true);

	});

});
