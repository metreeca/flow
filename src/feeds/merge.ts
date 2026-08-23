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
import { Data, Pipe } from "../index.js";
import { flatten } from "../index.core.js";
import { items } from "./items.js";

/**
 * Merges multiple data sources into a single stream, yielding items as they become available.
 *
 * Items are emitted in the order they resolve, not in source order.
 * All sources are consumed concurrently.
 *
 * @typeParam V The type of items in the streams
 *
 * @param sources The data sources to merge, each supplied either directly or as a promise
 *
 * @returns A pipe containing all items from all sources
 *
 * @example
 *
 * ```typescript
 * // Order depends on async timing
 * await merge(items([1, 2]), items([3, 4]))(toArray());  // e.g., [1, 3, 2, 4]
 * ```
 */
export function merge<V>(...sources: readonly Awaitable<Data<V>>[]): Pipe<V> {

	return items((async function* () {

		const iterators = await Promise.all(
			sources.map(async source => flatten(await source)[Symbol.asyncIterator]())
		);

		const pending = new Map(
			iterators.map(iterator => {
				return [iterator, iterator.next().then(result => ({ iterator, result }))] as const;
			})
		);

		try {

			while ( pending.size > 0 ) {

				const { iterator, result } = await Promise.race(pending.values());

				if ( result.done ) {

					pending.delete(iterator);

				} else { // schedule next iteration before yielding to prevent race conditions

					pending.set(iterator, iterator.next().then((result: IteratorResult<V>) => ({
						iterator,
						result
					})));

					yield result.value;

				}
			}

		} finally { // clean up any remaining iterators on error or early termination

			await Promise.allSettled(
				Array.from(pending.keys()).map(iterator => iterator.return?.())
			);

		}

	})());

}
