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
 * Creates a task discarding repeated items.
 *
 * Items are emitted lazily, in source order, keeping the first occurrence of each key and discarding the ones
 * following it. Keys are compared with `SameValueZero` semantics, so `NaN` matches itself and `-0` matches `0`, and
 * structured keys are matched by identity rather than by content.
 *
 * > [!WARNING]
 * >
 * > Retains every key seen so far in memory. For large or infinite streams carrying many distinct keys, this may
 * > exhaust memory.
 *
 * @typeParam V The type of items in the stream
 * @typeParam K The type of the comparison key
 *
 * @param selector The function extracting the comparison key from each item; items are compared directly when
 *   omitted
 *
 * @returns A task yielding the first item bearing each distinct key
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2, 2, 3, 1]))
 *   (distinct())
 *   (toArray())
 * );  // [1, 2, 3]
 *
 * await pipe(
 *   (items([{ id: 1 }, { id: 2 }, { id: 1 }]))
 *   (distinct(x => x.id))
 *   (toArray())
 * );  // [{ id: 1 }, { id: 2 }]
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
