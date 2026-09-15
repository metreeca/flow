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

import { describe, expectTypeOf, it } from "vitest";
import { items } from "../feeds/items.js";
import type { Feed, Task } from "../index.js";
import { mix } from "./mix.js";


describe("mix()", () => {

	it("should report the items of the feed drawn and of the sources", async () => {

		const feed = (items([1, 2, 3]))(mix(items(["a"])));

		expectTypeOf(feed).toEqualTypeOf<Feed<number | string>>();

	});

	it("should keep the feed type when no source is handed over", async () => {

		const feed = (items([1, 2, 3]))(mix());

		expectTypeOf(feed).toEqualTypeOf<Feed<number>>();

	});

	it("should take the item type of a source from its shape", async () => {

		expectTypeOf((items([1]))(mix(["a"]))).toEqualTypeOf<Feed<number | string>>();
		expectTypeOf((items([1]))(mix(Promise.resolve("a")))).toEqualTypeOf<Feed<number | string>>();
		expectTypeOf((items([1]))(mix(true))).toEqualTypeOf<Feed<number | boolean>>();

	});

	it("should take the item type from the declared task", async () => {

		const task: Task<number, number | string> = mix(items(["a"]));

		expectTypeOf(task).toEqualTypeOf<Task<number, number | string>>();

	});

	it("should report the declared item types of several sources", async () => {

		const feed = (items([1]))(mix<number, string | boolean>(items(["a"]), [true]));

		expectTypeOf(feed).toEqualTypeOf<Feed<number | string | boolean>>();

	});

	it("should reject sources contributing items of an undeclared type", async () => {

		// @ts-expect-error — a boolean source is not declared among the mixed item types
		(items([1]))(mix<number, string>(items(["a"]), [true]));

	});

});
