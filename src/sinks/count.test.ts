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
import { items, range } from "../feeds/index.js";
import { filter, map } from "../tasks/index.js";
import { count } from "./count.js";


describe("count()", () => {

	it("should count all items in stream", async () => {

		const result = await items(1, 2, 3, 4, 5)(count());

		expect(result).toBe(5);

	});

	it("should return zero for empty stream", async () => {

		const result = await items<number>()(count());

		expect(result).toBe(0);

	});

	it("should count items after filtering", async () => {

		const result = await items(1, 2, 3, 4, 5, 6)(filter(x => x%2 === 0))(count());

		expect(result).toBe(3);

	});

	it("should count items in range", async () => {

		const result = await range(1, 101)(count());

		expect(result).toBe(100);

	});

	it("should count items after mapping", async () => {

		const result = await items(1, 2, 3)(map(x => x*2))(count());

		expect(result).toBe(3);

	});

});
