/*
 * Copyright © 2026 Metreeca srl
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

import { describe, expectTypeOf, it } from "vitest";
import { items } from "../feeds/items.js";
import type { Feed, Task } from "../index.js";
import { map } from "./map.js";
import { when } from "./when.js";


describe("when()", () => {

	const isString = (value: unknown): value is string => typeof value === "string";

	it("should carry the item type over to both tasks under a condition", async () => {

		(items([1, 2, 3]))(when(
			value => value%2 === 0,
			map(value => expectTypeOf(value).toEqualTypeOf<number>() && value),
			map(value => expectTypeOf(value).toEqualTypeOf<number>() && value)
		));

	});

	it("should narrow the items handed to the first task to the type a guard admits", async () => {

		(items<string | number>([1, "a"]))(when(
			isString,
			map(value => expectTypeOf(value).toEqualTypeOf<string>() && value.length),
			map(value => value)
		));

	});

	it("should hand the second task the item type unchanged under a guard", async () => {

		(items<string | number>([1, "a"]))(when(
			isString,
			map(value => value.length),
			map(value => expectTypeOf(value).toEqualTypeOf<string | number>() && 0)
		));

	});

	it("should keep the item type under a guard admitting a type unrelated to the items", async () => {

		(items([1, 2, 3]))(when(
			(value: unknown): value is Date => value instanceof Date,
			map(value => expectTypeOf(value).toEqualTypeOf<number>() && value),
			map(value => value)
		));

	});

	it("should report the item type of the tasks", async () => {

		const feed = (items<unknown>([1, "a"]))(when(isString, map(value => value.length), map(() => 0)));

		expectTypeOf(feed).toEqualTypeOf<Feed<number>>();

	});

	it("should accept the item types as explicit type arguments", async () => {

		expectTypeOf(when<number, string>(
			value => value > 1,
			map(value => `${value}`),
			map(value => `${value}`)
		)).toEqualTypeOf<Task<number, string>>();

	});

	it("should reject a first task unable to process the items a guard admits", async () => {

		(items<string | number>([1, "a"]))(when(
			isString,
			// @ts-expect-error — a boolean task cannot process strings
			map((value: boolean) => value),
			map(() => true)
		));

	});

});
