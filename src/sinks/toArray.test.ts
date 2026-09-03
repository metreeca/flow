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

import { immutable } from "@metreeca/core/structures";
import { describe, expect, it } from "vitest";
import { items } from "../feeds/index.js";
import { toArray } from "./toArray.js";


describe("toArray()", () => {

	it("should collect the items in source order", async () => {

		const values = await items([3, 1, 2])(toArray());

		expect(values).toEqual([3, 1, 2]);

	});

	it("should collect falsy items", async () => {

		const values = await items([0, false, "", null, undefined])(toArray());

		expect(values).toEqual([0, false, "", null, undefined]);

	});

	it("should resolve to an empty array for an empty feed", async () => {

		const values = await items<number>([])(toArray());

		expect(values).toEqual([]);

	});

	it("should deeply freeze the collected array", async () => {

		const values = await items([{ nested: { value: 1 } }])(toArray());

		expect(Object.isFrozen(values)).toBeTruthy();
		expect(Object.isFrozen(values[0])).toBeTruthy();
		expect(Object.isFrozen(values[0].nested)).toBeTruthy();

	});

	it("should clone structured items, giving them a fresh identity", async () => {

		const item = { nested: { value: 1 } };

		const values = await items([item])(toArray());

		expect(values[0]).not.toBe(item);
		expect(values[0]).toEqual(item);

	});

	it("should collect immutable items under their own identity", async () => {

		const item = immutable({ nested: { value: 1 } });

		const values = await items([item])(toArray());

		expect(values[0]).toBe(item);

	});

	it("should collect non-plain values as they are", async () => {

		const item = new Date();

		const values = await items([item])(toArray());

		expect(values[0]).toBe(item);

	});

});
