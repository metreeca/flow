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
import { Feed } from "../index.js";
import { feed } from "./feed.js";


/**
 * Creates a feed from repeated calls to a generator function.
 *
 * The generator is called on demand, once the value it returned last has been consumed, and the feed ends as soon as
 * a call returns `undefined`. Every other value is contributed as a single item, whatever its shape and without being
 * expanded further, so arrays and iterables are carried whole and falsy values are preserved. A promised value is
 * awaited before being contributed, so cursors, queues and any other source producing one value at a time are driven
 * directly by the feed.
 *
 * Generators that never run dry produce an infinite feed, to be bounded downstream by a task such as
 * {@link tasks.take take} or by a sink deciding its outcome early.
 *
 * @typeParam V The type of values contributed to the feed
 *
 * @param generator The function called repeatedly to produce the next value; an `undefined` result ends the feed
 *
 * @returns A feed yielding the values returned by successive generator calls
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (iterate(() => Math.random()))
 *   (take(3))
 *   (toArray())
 * );  // [0.123, 0.456, 0.789]
 * ```
 *
 * @see {@link feed} to open a feed from a source expanded according to its shape
 */
export function iterate<V>(generator: () => Awaitable<undefined | V>): Feed<V> {

	return feed((async function* () {

		for (let value = await generator(); value !== undefined; value = await generator()) {

			yield value;

		}

	})());

}
