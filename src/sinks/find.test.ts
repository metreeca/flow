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
import { Feed } from "../index.js";
import { filter } from "../tasks/filter.js";
import { find } from "./find.js";


/**
 * Creates an endless feed of consecutive integers from 0, reporting how many items it was drawn for.
 */
function endless(): { readonly feed: Feed<number>, readonly drawn: () => number } {

	const draws = { count: 0 };

	return {

		feed: inlet(() => draws.count++),

		drawn: () => draws.count

	};

}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

describe("find()", () => {

	it("should resolve to the first item", async () => {

		const result = await items([1, 2, 3])(find());

		expect(result).toBe(1);

	});

	it("should resolve to the first item retained by an upstream filter", async () => {

		const result = await items([1, 2, 3, 4, 5])(filter(x => x > 2))(find());

		expect(result).toBe(3);

	});

	it("should resolve to an undefined item the feed carries", async () => {

		const result = await items([undefined])(find());

		expect(result).toBeUndefined();

	});

	it("should resolve to undefined for an empty feed", async () => {

		const result = await items<number>([])(find());

		expect(result).toBeUndefined();

	});

	it("should stop drawing at the first item, completing an infinite feed", async () => {

		const source = endless();

		const result = await source.feed(find());

		expect(result).toBe(0);
		expect(source.drawn()).toBe(1);

	});

});
