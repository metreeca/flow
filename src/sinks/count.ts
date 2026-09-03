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
 * Creates a sink counting the items of the feed.
 *
 * > [!WARNING]
 * >
 * > - **Exhaustive**: every item is drawn before the sink resolves, so an infinite feed never completes.
 * > - **Streaming**: no more than the running count is held in memory, whatever the size of the feed.
 * > - **Stateful**: the count covers the items drawn, so a sink closing a nested or truncated feed sees those alone.
 *
 * @typeParam V The type of items in the feed
 *
 * @returns A sink resolving to the number of items the feed carried
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2, 3, 4, 5]))
 *   (count())
 * );  // 5
 *
 * await pipe(
 *   (items<number>([]))
 *   (count())
 * );  // 0
 * ```
 */
export function count<V>(): Sink<V, number> {

	return async source => {

		let count = 0;

		for await (const _ of source) {
			count++;
		}

		return count;

	};

}
