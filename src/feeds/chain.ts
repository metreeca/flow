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
 * Creates a feed concatenating multiple feeds.
 *
 * Feeds are consumed one at a time, each fully drained before the next is opened, so items are emitted in argument
 * order and a feed that never runs dry starves the ones behind it. Nothing is drawn from a feed until its turn comes,
 * so a feed deferring retrieval until consumption, as {@link feed} does with a promised data source, is left
 * untouched until then.
 *
 * @typeParam V The type of values contributed to the feed
 *
 * @param feeds The feeds to concatenate
 *
 * @returns A feed yielding the items of all feeds in argument order
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (chain(items(1, 2), items(3, 4)))
 *   (toArray())
 * );  // [1, 2, 3, 4]
 * ```
 *
 * @see {@link feed} to open a feed from a data source of any other shape
 */
export function chain<V>(...feeds: readonly Feed<V>[]): Feed<V> {

	return feed((async function* () {

		for (const source of feeds) {
			yield* source();
		}

	})());

}
