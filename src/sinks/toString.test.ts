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
import { toString } from "./toString.js";


describe("toString()", () => {

	it.each([
		[undefined, "1,2,3"],
		[",", "1,2,3"],
		[" - ", "1 - 2 - 3"],
		["\n", "1\n2\n3"],
		["", "123"]
	])("should join the items on the separator <%s>", async (separator, expected) => {

		const result = await items([1, 2, 3])(toString(separator));

		expect(result).toBe(expected);

	});

	it("should render items through their default string representation", async () => {

		const result = await items([true, { id: 1 }, "text"])(toString("|"));

		expect(result).toBe("true|[object Object]|text");

	});

	it("should render null and undefined items as empty strings", async () => {

		const result = await items([1, null, undefined, 2])(toString());

		expect(result).toBe("1,,,2");

	});

	it("should resolve to a lone item without separators", async () => {

		const result = await items([42])(toString());

		expect(result).toBe("42");

	});

	it("should resolve to an empty string for an empty feed", async () => {

		const result = await items<number>([])(toString());

		expect(result).toBe("");

	});

});
