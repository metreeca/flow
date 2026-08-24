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
import { toMap } from "./toMap.js";


describe("toMap()", () => {

	it("should collect items into map using key selector", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 3, name: "c" }
		)(toMap(item => item.id));

		expect(values).toEqual(new Map([
			[1, { id: 1, name: "a" }],
			[2, { id: 2, name: "b" }],
			[3, { id: 3, name: "c" }]
		]));

	});

	it("should collect items into map using key and value selectors", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 3, name: "c" }
		)(toMap(item => item.id, item => item.name));

		expect(values).toEqual(new Map([
			[1, "a"],
			[2, "b"],
			[3, "c"]
		]));

	});

	it("should support async key selectors", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		)(toMap(async item => {
			await Promise.resolve();
			return item.id;
		}));

		expect(values).toEqual(new Map([
			[1, { id: 1, name: "a" }],
			[2, { id: 2, name: "b" }]
		]));

	});

	it("should support async value selectors", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		)(toMap(
			item => item.id,
			async item => {
				await Promise.resolve();
				return item.name.toUpperCase();
			}
		));

		expect(values).toEqual(new Map([
			[1, "A"],
			[2, "B"]
		]));

	});

	it("should report duplicate keys", async () => {

		await expect(items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 1, name: "c" }
		)(toMap(item => item.id, item => item.name))).rejects.toThrow("duplicate key <1>");

	});

	it("should report duplicate keys with SameValueZero semantics", async () => {

		await expect(items(0, -0)(toMap(x => x))).rejects.toThrow("duplicate key <0>");
		await expect(items(NaN, NaN)(toMap(x => x))).rejects.toThrow("duplicate key <NaN>");

	});

	it("should deeply freeze collected keys and values", async () => {

		const values = await items({ id: { value: 1 }, nested: { value: 1 } })(toMap(item => item.id));

		const [[key, value]] = [...values];

		expect(Object.isFrozen(key)).toBeTruthy();
		expect(Object.isFrozen(value)).toBeTruthy();
		expect(Object.isFrozen(value.nested)).toBeTruthy();

	});

	it("should retain immutable keys under their own identity", async () => {

		const key = immutable({ id: 1 });

		const values = await items(key)(toMap(item => item));

		expect(values.has(key)).toBeTruthy();

	});

	it("should clone mutable keys as distinct entries", async () => {

		const key = { id: 1 };

		const values = await items(key, key)(toMap(item => item));

		expect(values.has(key)).toBeFalsy();
		expect(values.size).toBe(2);

	});

	it("should reject mutations", async () => {

		const values = await items(1, 2, 3)(toMap(x => x)) as Map<number, number>; // ;(cast) exercising runtime immutability

		expect(() => values.set(4, 4)).toThrow(TypeError);
		expect(() => values.delete(1)).toThrow(TypeError);
		expect(() => values.clear()).toThrow(TypeError);

		expect(values).toEqual(new Map([[1, 1], [2, 2], [3, 3]]));

	});

	it("should reject extensions", async () => {

		const values = await items(1, 2, 3)(toMap(x => x));

		expect(Object.isFrozen(values)).toBeTruthy();

	});

	it("should handle empty stream", async () => {

		const values = await items<{ id: number; name: string }>()(toMap(item => item.id));

		expect(values).toEqual(new Map());

	});

	it("should preserve insertion order", async () => {

		const values = await items(3, 1, 2)(toMap(x => x));

		expect([...values.keys()]).toEqual([3, 1, 2]);

	});

});
