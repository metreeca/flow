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
import { toArray } from "./toArray.js";


describe("toArray()", () => {

	it("should collect all items into array", async () => {

		const values = await items([1, 2, 3])(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should handle empty stream", async () => {

		const values = await items([] as number[])(toArray());

		expect(values).toEqual([]);

	});

	it("should deeply freeze the collected array", async () => {

		const values = await items([{ nested: { value: 1 } }])(toArray());

		expect(Object.isFrozen(values)).toBeTruthy();
		expect(Object.isFrozen(values[0])).toBeTruthy();
		expect(Object.isFrozen(values[0].nested)).toBeTruthy();

	});

	it("should clone plain structures", async () => {

		const item = { nested: { value: 1 } };

		const values = await items([item])(toArray());

		expect(values[0]).not.toBe(item);
		expect(values[0]).toEqual(item);

	});

	it("should collect non-plain values as-is", async () => {

		const item = new Date();

		const values = await items([item])(toArray());

		expect(values[0]).toBe(item);

	});

});
