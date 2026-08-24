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

import { assert } from "@metreeca/core";
import { Task } from "../index.js";


/**
 * Creates a task collecting consecutive items into fixed-size batches.
 *
 * Batches are emitted as soon as they fill up, in source order and with items in source order, so only one batch is
 * held in memory at a time; the last batch is emitted short if the stream ends before it fills up, and no batch is
 * emitted at all for an empty stream.
 *
 * > [!WARNING]
 * >
 * > An unbounded `size` accumulates the whole stream in memory before emitting the single batch holding it. For large
 * > or infinite streams, this may exhaust memory or never complete: batch by a positive size to keep consumption
 * > bounded.
 *
 * @typeParam V The type of items in the stream
 *
 * @param size The maximum number of items per batch, defaulting to `0`; values less than 1 are treated as unbounded,
 *   collecting the whole stream into a single batch
 *
 * @returns A task yielding the read-only lists of the items collected into each batch
 *
 * @throws {TypeError} If `size` is not an integer
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2, 3, 4, 5]))
 *   (batch(2))
 *   (toArray())
 * );  // [[1, 2], [3, 4], [5]]
 *
 * await pipe(
 *   (items([1, 2, 3]))
 *   (batch())
 *   (toArray())
 * );  // [[1, 2, 3]]
 * ```
 */
export function batch<V>(size: number = 0): Task<V, readonly V[]> {

	const limit = assert(size, Number.isInteger, value => `expected integer size <${value}>`);

	return async function* (source: AsyncIterable<V>) {

		const batch: V[] = [];

		for await (const item of source) {

			batch.push(item);

			if ( limit > 0 && batch.length >= limit ) {
				yield batch.splice(0);
			}
		}

		if ( batch.length > 0 ) {
			yield batch;
		}
	};

}
