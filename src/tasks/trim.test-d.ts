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
import type { Feed } from "../index.js";
import { map } from "./map.js";
import { trim } from "./trim.js";


describe("trim()", () => {

	it("should strip undefined from the item type", async () => {

		expectTypeOf((items([1, undefined]))(trim())).toEqualTypeOf<Feed<number>>();

	});

	it("should retain null in the item type", async () => {

		expectTypeOf((items([1, null, undefined]))(trim())).toEqualTypeOf<Feed<null | number>>();

	});

	it("should strip undefined from the item type the task reports", async () => {

		expectTypeOf((items([1, 2]))(trim(map(n => n%2 ? `${n}` : undefined)))).toEqualTypeOf<Feed<string>>();

	});

});
