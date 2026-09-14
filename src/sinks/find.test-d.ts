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
import { find } from "./find.js";


describe("find()", () => {

	it("should retrieve an optional item of the feed type", async () => {

		expectTypeOf(await (items([1, 2, 3]))(find())).toEqualTypeOf<undefined | number>();

	});

	it("should reject a predicate", async () => {

		// @ts-expect-error — items are no longer tested, as filtering is a task of its own
		await (items([1, 2, 3]))(find(item => item > 2));

	});

});
