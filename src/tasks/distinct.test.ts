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

	it("should filter out duplicate primitives", async () => {

		const values = await items(1, 2, 2, 3, 1, 4)(distinct())(toArray());

		expect(values).toEqual([1, 2, 3, 4]);

	});

	it("should use selector for comparison", async () => {

		const values = await items(
			{ id: 1, name: "a" },
			{ id: 2, name: "b" },
			{ id: 1, name: "c" }
		)(distinct(item => item.id))(toArray());

		expect(values).toEqual([
			{ id: 1, name: "a" },
			{ id: 2, name: "b" }
		]);

	});

	it("should handle empty feed", async () => {

		const values = await items<number>()(distinct())(toArray());

		expect(values).toEqual([]);

	});

});
