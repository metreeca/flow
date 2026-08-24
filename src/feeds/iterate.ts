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
 * Creates a pipe from repeated calls to a generator function.
 *
 * The generator is called on demand, once the data it returned last has been fully consumed, and the stream ends as
 * soon as a call contributes no item, that is when it returns `undefined` or an empty {@link index.Data Data} value.
 * A promised result is awaited before being contributed, so pagination endpoints, database cursors and any other
 * source fetching a batch at a time are driven directly by the stream.
 *
 * Generators that never run dry produce an infinite stream, to be bounded downstream by a task such as
 * {@link tasks.take take} or by a sink deciding its outcome early.
 *
 * @typeParam V The type of items in the stream
 *
 * @param generator The function called repeatedly to produce the next batch of data
 *
 * @returns A pipe yielding the items contributed by successive generator calls
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
 */
export function iterate<V>(generator: () => Awaitable<undefined | Data<V>>): Pipe<V> {

	return items((async function* () {

		for (let data = await generator(); data !== undefined; data = await generator()) {

			const iterable = flatten(data);
			const iterator = iterable[Symbol.asyncIterator]();
			const first = await iterator.next();

			if ( first.done ) {

				return;

			} else {

				yield first.value;
				yield* iterator;

			}
		}

	})());

}
