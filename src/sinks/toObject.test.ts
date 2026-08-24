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
import { toObject } from "./toObject.js";


describe("toObject()", () => {

	it("should collect items into object using key selector", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 3, name: "c" }
		)(toObject(item => item.id));

		expect(values).toEqual({
			1: { id: 1, name: "a" },
			2: { id: 2, name: "b" },
			3: { id: 3, name: "c" }
		});

	});

	it("should collect items into object using key and value selectors", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 3, name: "c" }
		)(toObject(item => item.id, item => item.name));

		expect(values).toEqual({ 1: "a", 2: "b", 3: "c" });

	});

	it("should support async key selectors", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		)(toObject(async item => {
			await Promise.resolve();
			return item.id;
		}));

		expect(values).toEqual({
			1: { id: 1, name: "a" },
			2: { id: 2, name: "b" }
		});

	});

	it("should support async value selectors", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		)(toObject(
			item => item.id,
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

		const values = await items(1, 2)(toObject(n => n === 1 ? one : two));

		expect(values[one]).toBe(1);
		expect(values[two]).toBe(2);

	});

	it("should collect reserved keys as own properties", async () => {

		const values = await items("__proto__")(toObject(k => k, () => "polluted"));

		expect(Object.hasOwn(values, "__proto__")).toBe(true);
		expect(Object.getPrototypeOf(values)).toBe(Object.prototype);

	});

	it("should report duplicate keys", async () => {

		await expect(items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 1, name: "c" }
		)(toObject(item => item.id, item => item.name))).rejects.toThrow("duplicate key <1>");

	});

	it("should report duplicate keys after property key coercion", async () => {

		await expect(data<number | string>([1, "1"])(toObject(x => x)))
			.rejects.toThrow("duplicate key <1>");

	});

	it("should handle empty stream", async () => {

		const values = await items<{ id: number; name: string }>()(toObject(item => item.id));

		expect(values).toEqual({});

	});

	it("should preserve insertion order", async () => {

		const values = await items("c", "a", "b")(toObject(x => x));

		expect(Object.keys(values)).toEqual(["c", "a", "b"]);

	});

	it("should deeply freeze the collected object", async () => {

		const values = await items({ id: 1, nested: { value: 1 } })(toObject(item => item.id));

		expect(Object.isFrozen(values)).toBeTruthy();
		expect(Object.isFrozen(values[1])).toBeTruthy();
		expect(Object.isFrozen(values[1].nested)).toBeTruthy();

	});

	it("should reject keys that are not property keys", () => {

		// @ts-expect-error object keys don't support property key coercion

		toObject((n: number) => ({ id: n }));

	});

});
