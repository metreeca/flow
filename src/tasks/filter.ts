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
 * Creates a task retaining only the items matching a predicate.
 *
 * Items are tested lazily, one at a time, and emitted in source order.
 *
 * @typeParam V The type of items in the feed
 *
 * @param predicate The function testing each item; an `undefined` result is treated as `false` and the item is
 *   discarded
 *
 * @returns A task yielding the items matching `predicate`
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(1, 2, 3, 4, 5))
 *   (filter(n => n%2 === 0))
 *   (toArray())
 * );  // [2, 4]
 * ```
 */
export function filter<V>(predicate: (item: V) => Awaitable<undefined | boolean>): Task<V> {

	return async function* (source: AsyncIterable<V>) {

		for await (const item of source) {
			if ( await predicate(item) ) {
				yield item;
			}
		}

	};

}
