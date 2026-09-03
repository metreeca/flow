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
import { distinct } from "./distinct.js";


describe("distinct()", () => {

	it("should keep the first occurrence of each item, in source order", async () => {

		const values = await items([1, 2, 2, 3, 1, 4])(distinct())(toArray());

		expect(values).toEqual([1, 2, 3, 4]);

	});

	it("should collapse items sharing SameValueZero identity", async () => {

		const values = await items([NaN, NaN, 0, -0])(distinct())(toArray());

		expect(values).toEqual([NaN, 0]);

	});

	it("should match structured items by identity", async () => {

		const shared = { id: 1 };

		const values = await items([shared, { id: 1 }, shared])(distinct())(toArray());

		expect(values).toEqual([shared, { id: 1 }]); // the structural twin is a distinct key

	});

	it("should keep the first item bearing each selected key", async () => {

		const values = await items([
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 1, name: "c" }
		])(distinct(item => item.id))(toArray());

		expect(values).toEqual([
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		]);

	});

	it("should await asynchronous selectors", async () => {

		const values = await items([1, 2, 3, 4])(distinct(async item => {
			await Promise.resolve();
			return item%2;
		}))(toArray());

		expect(values).toEqual([1, 2]);

	});

	it("should emit nothing for an empty feed", async () => {

		const values = await items<number>([])(distinct())(toArray());

		expect(values).toEqual([]);

	});

	it("should propagate selector failures", async () => {

		await expect(items([1, 2, 3])(distinct(item => {
			if ( item === 2 ) { throw new Error("selector failed"); }
			return item;
		}))(toArray())).rejects.toThrow("selector failed");

	});

});
