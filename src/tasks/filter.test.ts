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


describe("filter()", () => {

	it("should filter items by predicate", async () => {

		const values = await items([1, 2, 3, 4, 5])(filter(x => x%2 === 0))(toArray());

		expect(values).toEqual([2, 4]);

	});

	it("should support async predicates", async () => {

		const values = await items([1, 2, 3, 4, 5])(filter(async x => {
			await Promise.resolve();
			return x > 2;
		}))(toArray());

		expect(values).toEqual([3, 4, 5]);

	});

	it("should handle empty results", async () => {

		const values = await items([1, 2, 3])(filter(() => false))(toArray());

		expect(values).toEqual([]);

	});

	it("should treat undefined as false", async () => {

		const values = await items([1, 2, 3, 4, 5])(filter(x => x > 3 ? true : undefined))(toArray());

		expect(values).toEqual([4, 5]);

	});

	it("should handle async predicates returning undefined", async () => {

		const values = await items([1, 2, 3, 4, 5])(filter(async x => {
			await Promise.resolve();
			return x%2 === 0 ? true : undefined;
		}))(toArray());

		expect(values).toEqual([2, 4]);

	});

});
