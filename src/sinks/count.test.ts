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
import { take } from "../tasks/index.js";
import { count } from "./count.js";


describe("count()", () => {

	it("should count the items of the feed", async () => {

		const result = await items([1, 2, 3, 4, 5])(count());

		expect(result).toBe(5);

	});

	it("should count falsy items", async () => {

		const result = await items([0, false, "", null, undefined])(count());

		expect(result).toBe(5);

	});

	it("should resolve to zero for an empty feed", async () => {

		const result = await items<number>([])(count());

		expect(result).toBe(0);

	});

	it("should count the items drawn from a truncated feed", async () => {

		const result = await items([1, 2, 3, 4, 5])(take(2))(count());

		expect(result).toBe(2);

	});

});
