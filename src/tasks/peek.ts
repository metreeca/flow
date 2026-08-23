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
 * Creates a task executing a side effect for each item without modifying the stream.
 *
 * Items are processed sequentially and output order is preserved.
 * Useful for debugging or monitoring items as they flow through the pipeline.
 *
 * @typeParam V The type of items in the stream
 *
 * @param consumer The function to execute for each item (return value is ignored)
 *
 * @returns A task that executes the consumer for each item
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3])(peek(x => console.log(x)))(toArray());
 * // Logs: 1, 2, 3
 * // Returns: [1, 2, 3]
 * ```
 */
export function peek<V>(consumer: (item: V) => unknown): Task<V> {
	return async function* (source: AsyncIterable<V>) {
		for await (const item of source) {
			await consumer(item);
			yield item;
		}
	};
}
