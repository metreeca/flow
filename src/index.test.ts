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
import { items } from "./feeds/index.js";
import { pipe } from "./index.js";
import { toArray } from "./sinks/index.js";
import { filter, map } from "./tasks/index.js";


describe("pipe()", () => {

	it("should hand back the feed a pipe left open ends with", async () => {

		const feed = items([1, 2, 3])(map(x => x*2));

		expect(pipe(feed)).toBe(feed);

	});

	it("should hand back the promise the closing sink reports", async () => {

		const result = items([1, 2, 3])(toArray());

		expect(pipe(result)).toBe(result);
		expect(await result).toEqual([1, 2, 3]);

	});

	it("should leave the bracketed feed open for further composition", async () => {

		const values = await pipe(items([1, 2, 3, 4]))(filter(x => x > 2))(toArray());

		expect(values).toEqual([3, 4]);

	});

	it("should leave the bracketed feed open for manual iteration", async () => {

		const values: number[] = [];

		for await (const value of pipe((items([1, 2, 3, 4]))(filter(x => x > 1)))) {
			values.push(value);
		}

		expect(values).toEqual([2, 3, 4]);

	});

});
