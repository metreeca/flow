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
import { skip } from "./skip.js";


describe("skip()", () => {

	it("should skip first n items", async () => {

		const values = await items(1, 2, 3, 4, 5)(skip(2))(toArray());

		expect(values).toEqual([3, 4, 5]);

	});

	it("should skip all items when n >= length", async () => {

		const values = await items(1, 2, 3)(skip(5))(toArray());

		expect(values).toEqual([]);

	});

	it("should skip zero items", async () => {

		const values = await items(1, 2, 3)(skip(0))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should treat negative n as zero", async () => {

		const values = await items(1, 2, 3)(skip(-5))(toArray());

		expect(values).toEqual([1, 2, 3]);

	});

	it("should reject non-integer n", () => {

		expect(() => skip(1.5)).toThrow(TypeError);
		expect(() => skip(NaN)).toThrow(TypeError);
		expect(() => skip(Infinity)).toThrow(TypeError);

	});

});
