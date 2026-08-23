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
 * Creates a pipe by repeatedly calling a generator function until exhausted.
 *
 * The generator is called on demand and returned data is flattened into the stream.
 * Iteration stops when the generator returns `undefined`, an empty array, or an empty iterator.
 *
 * The generator may return its data either directly or as a promise: asynchronous generators are useful for
 * pagination APIs, database cursors, or any data source where fetching the next batch requires an asynchronous
 * operation.
 *
 * @typeParam V The type of items in the stream
 *
 * @param generator The possibly asynchronous function to call repeatedly to generate data, returning `undefined` to
 *   terminate
 *
 * @returns A pipe yielding items from successive generator calls
 *
 * @example
 *
 * ```typescript
 * // Infinite random numbers
 * await iterate(() => Math.random())(take(3))(toArray());  // [0.123, 0.456, 0.789]
 *
 * // Counter that stops at 3
 * let count = 0;
 * await iterate(() => count++ < 3 ? count : undefined)(toArray());  // [1, 2, 3]
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
