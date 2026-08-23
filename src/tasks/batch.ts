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

import { Task } from "../index.js";

/**
 * Creates a task grouping items into batches of a specified size.
 *
 * Items are processed sequentially and order is preserved both across batches and within each batch.
 *
 * If size is 0 or negative, collects all items into a single batch.
 * The final batch may contain fewer items than the specified size.
 *
 * @typeParam V The type of items in the stream
 *
 * @param size The maximum number of items per batch (0 or negative for unbounded)
 *
 * @defaultValue 0
 *
 * @returns A task that groups items into batches
 *
 * @remarks
 *
 * When size is 0 or negative, all stream items are accumulated in memory before
 * yielding a single batch. For large or infinite streams, this may cause
 * memory issues. Use a positive size for bounded memory consumption.
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3, 4, 5])(batch(2))(toArray());  // [[1, 2], [3, 4], [5]]
 *
 * // Collect all into single batch
 * await items([1, 2, 3])(batch())(toArray());  // [[1, 2, 3]]
 * ```
 */
export function batch<V>(size: number = 0): Task<V, readonly V[]> {
	return async function* (source: AsyncIterable<V>) {

		const batch: V[] = [];

		for await (const item of source) {

			batch.push(item);

			if ( size > 0 && batch.length >= size ) {
				yield batch.splice(0);
			}
		}

		if ( batch.length > 0 ) {
			yield batch;
		}
	};
}
