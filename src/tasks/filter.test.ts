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
import { inlet, items } from "../feeds/index.js";
import { pipe } from "../index.js";
import { toArray } from "../sinks/index.js";
import { filter } from "./filter.js";
import { take } from "./take.js";


describe("filter()", () => {

	it("should retain the matching items in source order", async () => {

		const values = await items([1, 2, 3, 4, 5])(filter(x => x%2 === 0))(toArray());

		expect(values).toEqual([2, 4]);

	});

	it("should retain falsy items the predicate matches", async () => {

		const values = await items([0, 1, undefined, 2])(filter(x => x !== 1))(toArray());

		expect(values).toEqual([0, undefined, 2]);

	});

	it("should await asynchronous predicates", async () => {

		const values = await items([1, 2, 3, 4, 5])(filter(async x => {
			await Promise.resolve();
			return x > 2;
		}))(toArray());

		expect(values).toEqual([3, 4, 5]);

	});

	it("should emit items as they are drawn", async () => {

		const count = { next: 0 };

		const values = await pipe( // an infinite feed completes, as the quota downstream is met before it runs dry
			(inlet(() => count.next++))
			(filter(x => x%2 === 0))
			(take(3))
			(toArray())
		);

		expect(values).toEqual([0, 2, 4]);

	});

	it("should emit nothing where no item matches", async () => {

		const values = await items([1, 2, 3])(filter(() => false))(toArray());

		expect(values).toEqual([]);

	});

	it("should propagate predicate failures", async () => {

		await expect(items([1, 2, 3])(filter(x => {
			if ( x === 2 ) { throw new Error("predicate failed"); }
			return true;
		}))(toArray())).rejects.toThrow("predicate failed");

	});

	it("should reject optional predicate results", async () => {

		// @ts-expect-error items are retained or discarded on a definite verdict

		filter((x: number) => x > 3 ? true : undefined);

	});

});
