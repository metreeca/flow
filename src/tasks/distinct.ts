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

import type { Awaitable } from "@metreeca/core/async";
import { Task } from "../index.js";

/**
 * Creates a task filtering out duplicate items.
 *
 * Items are processed sequentially and output order is preserved.
 * Only the first occurrence of each unique item is yielded.
 *
 * > [!WARNING]
 * >
 * > Maintains a `Set` of all seen items in memory. For large or infinite streams with many unique items, this may
 * > cause memory issues.
 *
 * @typeParam V The type of items in the stream
 * @typeParam K The type of comparison key
 *
 * @param selector Optional, possibly asynchronous function to extract comparison key from items
 *
 * @returns A task that filters out duplicate items
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 2, 3, 1])(distinct())(toArray());  // [1, 2, 3]
 *
 * // With selector
 * await items([{id: 1}, {id: 2}, {id: 1}])(distinct(x => x.id))(toArray());
 * // [{id: 1}, {id: 2}]
 * ```
 */
export function distinct<V, K>(selector?: (item: V) => Awaitable<K>): Task<V> {
	return async function* (source: AsyncIterable<V>) {

		const seen = new Set();

		for await (const item of source) {

			const key = selector ? await selector(item) : item;

			if ( !seen.has(key) ) {
				seen.add(key);
				yield item;
			}
		}

	};
}
