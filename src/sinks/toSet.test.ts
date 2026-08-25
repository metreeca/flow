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
import { toSet } from "./toSet.js";


describe("toSet()", () => {

	it("should collect all items into set", async () => {

		const values = await items(1, 2, 3)(toSet());

		expect(values).toEqual(new Set([1, 2, 3]));

	});

	it("should remove duplicates", async () => {

		const values = await items(1, 2, 2, 3, 1, 4)(toSet());

		expect(values).toEqual(new Set([1, 2, 3, 4]));

	});

	it("should remove duplicates with SameValueZero semantics", async () => {

		const values = await items(NaN, NaN, 0, -0)(toSet());

		expect([...values]).toEqual([NaN, 0]);

	});

	it("should retain structurally equal items as distinct entries", async () => {

		const values = await items({ value: 1 }, { value: 1 })(toSet());

		expect(values.size).toBe(2);

	});

	it("should retain immutable items under their own identity", async () => {

		const item = immutable({ value: 1 });

		const values = await items(item, item)(toSet());

		expect(values.has(item)).toBeTruthy();
		expect(values.size).toBe(1);

	});

	it("should handle empty feed", async () => {

		const values = await items<number>()(toSet());

		expect(values).toEqual(new Set());

	});

	it("should deeply freeze collected items", async () => {

		const values = await items({ nested: { value: 1 } })(toSet());

		const [first] = [...values];

		expect(Object.isFrozen(first)).toBeTruthy();
		expect(Object.isFrozen(first.nested)).toBeTruthy();

	});

	it("should reject mutations", async () => {

		const values = await items(1, 2, 3)(toSet()) as Set<number>; // ;(cast) exercising runtime immutability

		expect(() => values.add(4)).toThrow(TypeError);
		expect(() => values.delete(1)).toThrow(TypeError);
		expect(() => values.clear()).toThrow(TypeError);

		expect(values).toEqual(new Set([1, 2, 3]));

	});

	it("should reject extensions", async () => {

		const values = await items(1, 2, 3)(toSet());

		expect(Object.isFrozen(values)).toBeTruthy();

	});

	it("should preserve insertion order", async () => {

		const values = await items(3, 1, 2)(toSet());

		expect([...values]).toEqual([3, 1, 2]);

	});

});
