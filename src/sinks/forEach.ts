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

import { Sink } from "../index.js";

/**
 * Creates a sink executing a side effect for each item and consuming the stream.
 *
 * Terminal operation that triggers stream execution.
 *
 * @typeParam V The type of items in the stream
 *
 * @param consumer The function to execute for each item (return value is ignored)
 *
 * @returns A sink that executes the consumer for each item and returns the number of processed items
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3])(forEach(x => console.log(x)));  // logs 1, 2, 3; returns 3
 * ```
 */
export function forEach<V>(consumer: (item: V) => unknown): Sink<V, number> {
	return async source => {

		let count = 0;

		for await (const item of source) {
			await consumer(item);
			count++;
		}

		return count;

	};
}
