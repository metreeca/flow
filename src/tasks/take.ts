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
 * Creates a task taking only the first n items from the stream.
 *
 * Items are processed sequentially and output order is preserved.
 *
 * @typeParam V The type of items in the stream
 *
 * @param n The maximum number of items to take (negative values treated as zero)
 *
 * @returns A task that takes the first n items
 *
 * @example
 *
 * ```typescript
 * await items([1, 2, 3, 4, 5])(take(3))(toArray());  // [1, 2, 3]
 * ```
 */
export function take<V>(n: number): Task<V> {
	return async function* (source: AsyncIterable<V>) {

		let count = 0;

		for await (const item of source) {
			if ( count < n ) {
				yield item;
				count++;
			} else {
				return;
			}
		}
	};
}
