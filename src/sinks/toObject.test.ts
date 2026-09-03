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
import { toObject } from "./toObject.js";


describe("toObject()", () => {

	const people = [
		{ id: 1, name: "a" },
		{ id: 2, name: "b" }
	];


	it("should pair each extracted key with the item it was extracted from", async () => {

		const values = await items(people)(toObject(item => item.id));

		expect(values).toEqual({
			1: { id: 1, name: "a" },
			2: { id: 2, name: "b" }
		});

	});

	it("should pair each extracted key with the value extracted alongside it", async () => {

		const values = await items(people)(toObject(item => item.id, item => item.name));

		expect(values).toEqual({ 1: "a", 2: "b" });

	});

	it("should await asynchronous key and value functions", async () => {

		const values = await items(people)(toObject(
			async item => {
				await Promise.resolve();
				return item.id;
			},
			async item => {
				await Promise.resolve();
				return item.name.toUpperCase();
			}
		));

		expect(values).toEqual({ 1: "A", 2: "B" });

	});

	it("should collect items under symbol keys", async () => {

		const one = Symbol("one");
		const two = Symbol("two");

		const values = await items([1, 2])(toObject(n => n === 1 ? one : two));

		expect(values[one]).toBe(1);
		expect(values[two]).toBe(2);

	});

	it("should collect reserved keys as own properties", async () => {

		const values = await items(["__proto__"])(toObject(k => k, () => "polluted"));

		expect(Object.hasOwn(values, "__proto__")).toBeTruthy();
		expect(Object.getPrototypeOf(values)).toBe(Object.prototype);

	});

	it("should resolve to an empty object for an empty feed", async () => {

		const values = await items<{ id: number }>([])(toObject(item => item.id));

		expect(values).toEqual({});

	});

	it("should enumerate string keys in collection order", async () => {

		const values = await items(["c", "a", "b"])(toObject(x => x));

		expect(Object.keys(values)).toEqual(["c", "a", "b"]);

	});

	it("should enumerate integer-like keys in ascending numeric order", async () => {

		const values = await items([30, 1, 2])(toObject(x => x));

		expect(Object.keys(values)).toEqual(["1", "2", "30"]);

	});

	it("should report duplicate keys", async () => {

		await expect(items([...people, { id: 1, name: "c" }])(toObject(item => item.id))).rejects.toThrow(Error);

	});

	it("should report keys colliding after property key coercion as duplicates", async () => {

		await expect(items<number | string>([1, "1"])(toObject(x => x))).rejects.toThrow(Error);

	});

	it("should deeply freeze the collected object", async () => {

		const values = await items([{ id: 1, nested: { value: 1 } }])(toObject(item => item.id));

		expect(Object.isFrozen(values)).toBeTruthy();
		expect(Object.isFrozen(values[1])).toBeTruthy();
		expect(Object.isFrozen(values[1].nested)).toBeTruthy();

	});

	it("should reject keys that are not property keys", async () => {

		// @ts-expect-error object keys don't support property key coercion

		toObject((n: number) => ({ id: n }));

	});

});
