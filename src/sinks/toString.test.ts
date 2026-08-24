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
import { filter, map } from "../tasks/index.js";
import { toString } from "./toString.js";


describe("toString()", () => {

	it("should join items with comma separator by default", async () => {

		const result = await items(1, 2, 3)(toString());

		expect(result).toBe("1,2,3");

	});

	it("should join string items", async () => {

		const result = await items("a", "b", "c")(toString());

		expect(result).toBe("a,b,c");

	});

	it("should handle undefined separator as default", async () => {

		const result = await items(1, 2, 3)(toString(undefined));

		expect(result).toBe("1,2,3");

	});

	it("should handle custom separator", async () => {

		const result = await items(1, 2, 3)(toString(" - "));

		expect(result).toBe("1 - 2 - 3");

	});

	it("should handle empty separator", async () => {

		const result = await items("a", "b", "c")(toString(""));

		expect(result).toBe("abc");

	});

	it("should handle empty stream", async () => {

		const result = await items<number>()(toString());

		expect(result).toBe("");

	});

	it("should handle single item", async () => {

		const result = await items(42)(toString());

		expect(result).toBe("42");

	});

	it("should convert objects to strings", async () => {

		const result = await items({ id: 1 }, { id: 2 })(toString("|"));

		expect(result).toBe("[object Object]|[object Object]");

	});

	it("should handle null and undefined", async () => {

		// Note: undefined values are automatically filtered out by items()
		const result = await items(1, null, undefined, 2)(toString(","));

		expect(result).toBe("1,,2");

	});

	it("should handle items after filtering", async () => {

		const result = await items(1, 2, 3, 4, 5, 6)(filter(x => x%2 === 0))(toString("-"));

		expect(result).toBe("2-4-6");

	});

	it("should handle items after mapping", async () => {

		const result = await items(1, 2, 3)(map(x => x*10))(toString(" "));

		expect(result).toBe("10 20 30");

	});

	it("should work with boolean values", async () => {

		const result = await items(true, false, true)(toString(","));

		expect(result).toBe("true,false,true");

	});

	it("should handle newline separator", async () => {

		const result = await items("line1", "line2", "line3")(toString("\n"));

		expect(result).toBe("line1\nline2\nline3");

	});

});
