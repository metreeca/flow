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

import { ascending } from "@metreeca/core/order";
import { Task } from "../index.js";

/**
 * Creates a task sorting items in the stream.
 *
 * All items are collected into memory before sorting, then yielded in sorted order.
 *
 * @typeParam V The type of items in the stream
 *
 * @param comparator Comparison function (defaults to {@link ascending})
 *
 * @returns A task that sorts items
 *
 * @remarks
 *
 * **Comparator Functions:**
 *
 * Use comparator utilities from the
 * [@metreeca/core](https://metreeca.github.io/core/modules/comparators.html)
 * comparators module to create complex sorting criteria.
 *
 * **Default Behavior:**
 *
 * The default {@link ascending} comparator sorts values in natural order: numbers numerically,
 * strings lexicographically, dates chronologically, and booleans with false before true.
 * Null and undefined values are placed at the beginning.
 *
 * **Memory Usage:**
 *
 * Accumulates all stream items in memory before sorting. For large or infinite streams,
 * this may cause memory issues or never complete.
 *
 * @example
 *
 * ```typescript
 * import { ascending, descending, by, chain } from "@metreeca/core/comparators";
 *
 * // Sort numbers (natural ascending order)
 * await items([3, 1, 2])(sort())(toArray());  // [1, 2, 3]
 *
 * // Descending order
 * await items([3, 1, 2])(sort(descending))(toArray());  // [3, 2, 1]
 *
 * // Sort by extracted key
 * await items([{age: 30}, {age: 20}])(sort(by(x => x.age)))(toArray());
 * // [{age: 20}, {age: 30}]
 *
 * // Sort by key in descending order
 * await items([{age: 20}, {age: 30}])(sort(by(x => x.age, descending)))(toArray());
 * // [{age: 30}, {age: 20}]
 *
 * // Custom comparator for locale-aware sorting
 * await items(["Émile", "Alice"])(sort((a, b) => a.localeCompare(b)))(toArray());
 *
 * // Sort by name length, then alphabetically
 * await items(people)(sort(chain(
 *   by(p => p.name.length),
 *   by(p => p.name)
 * )))(toArray());
 * ```
 */
export function sort<V>(comparator: (a: V, b: V) => number = ascending): Task<V> {

	return async function* (source: AsyncIterable<V>) {

		const items: V[] = [];

		for await (const item of source) {
			items.push(item);
		}

		yield* items.sort(comparator);

	};

}
