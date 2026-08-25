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

import { Feed } from "../index.js";
import { feed } from "./feed.js";


/**
 * Creates a feed interleaving multiple feeds.
 *
 * All feeds are opened together and consumed concurrently, each kept one item ahead, so items are emitted as they
 * become available rather than in argument order and a slow feed never holds back the others.
 *
 * > [!WARNING]
 * >
 * > Output order is not preserved: items interleave and overtake each other according to how quickly every feed
 * > produces them.
 *
 * @typeParam V The type of values contributed to the feed
 *
 * @param feeds The feeds to interleave
 *
 * @returns A feed yielding the items of all feeds as they become available
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (merge(items(1, 2), items(3, 4)))
 *   (toArray())
 * );  // [1, 3, 2, 4], depending on async timing
 * ```
 *
 * @see {@link feed} to open a feed from a data source of any other shape
 */
export function merge<V>(...feeds: readonly Feed<V>[]): Feed<V> {

	return feed((async function* () {

		function advance(iterator: AsyncIterator<V>) {
			return iterator.next().then(result => ({ iterator, result }));
		}

		// ;(cast) tuple narrowing consumed by the `Map` constructor, keying pending results by their own iterator

		const pending = new Map(feeds.map(source => {
			const iterator = source()[Symbol.asyncIterator]();
			return [iterator, advance(iterator)] as const;
		}));

		try {

			while ( pending.size > 0 ) {

				const { iterator, result } = await Promise.race(pending.values());

				if ( result.done ) {

					pending.delete(iterator);

				} else { // schedule next iteration before yielding to prevent race conditions

					pending.set(iterator, advance(iterator));

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
