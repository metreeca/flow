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

	const people = [
		{ id: 1, name: "a" },
		{ id: 2, name: "b" }
	];


	it("should pair each extracted key with the item it was extracted from, in source order", async () => {

		const values = await items(people)(toMap(item => item.id));

		expect([...values]).toEqual([
			[1, { id: 1, name: "a" }],
			[2, { id: 2, name: "b" }]
		]);

	});

	it("should pair each extracted key with the value extracted alongside it", async () => {

		const values = await items(people)(toMap(item => item.id, item => item.name));

		expect(values).toEqual(new Map([[1, "a"], [2, "b"]]));

	});

	it("should await asynchronous key and value functions", async () => {

		const values = await items(people)(toMap(
			async item => {
				await Promise.resolve();
				return item.id;
			},
			async item => {
				await Promise.resolve();
				return item.name.toUpperCase();
			}
		));

		expect(values).toEqual(new Map([[1, "A"], [2, "B"]]));

	});

	it("should resolve to an empty map for an empty feed", async () => {

		const values = await items<{ id: number }>([])(toMap(item => item.id));

		expect(values).toEqual(new Map());

	});

	it("should report duplicate keys", async () => {

		await expect(items([...people, { id: 1, name: "c" }])(toMap(item => item.id))).rejects.toThrow(Error);

	});

	it("should report keys sharing SameValueZero identity as duplicates", async () => {

		await expect(items([0, -0])(toMap(x => x))).rejects.toThrow(Error);
		await expect(items([NaN, NaN])(toMap(x => x))).rejects.toThrow(Error);

	});

	it("should deeply freeze the collected keys and values", async () => {

		const values = await items([{ id: { value: 1 }, nested: { value: 1 } }])(toMap(item => item.id));

		const [[key, value]] = [...values];

		expect(Object.isFrozen(key)).toBeTruthy();
		expect(Object.isFrozen(value)).toBeTruthy();
		expect(Object.isFrozen(value.nested)).toBeTruthy();

	});

	it("should collect structured keys as distinct entries", async () => {

		const key = { id: 1 };

		const values = await items([key, key])(toMap(item => item)); // cloned on freezing, so identity no longer matches

		expect(values.has(key)).toBeFalsy();
		expect(values.size).toBe(2);

	});

	it("should collect immutable keys under their own identity", async () => {

		const key = immutable({ id: 1 });

		const values = await items([key])(toMap(item => item));

		expect(values.has(key)).toBeTruthy();

	});

	it("should reject mutations", async () => {

		// ;(cast) exercising runtime immutability

		const values = await items([1, 2, 3])(toMap(x => x)) as Map<number, number>;

		expect(() => values.set(4, 4)).toThrow(TypeError);
		expect(() => values.delete(1)).toThrow(TypeError);
		expect(() => values.clear()).toThrow(TypeError);

		expect(values).toEqual(new Map([[1, 1], [2, 2], [3, 3]]));

	});

	it("should reject extensions", async () => {

		const values = await items([1, 2, 3])(toMap(x => x));

		expect(Object.isFrozen(values)).toBeTruthy();

	});

});
