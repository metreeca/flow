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
import type { Optional } from "@metreeca/core";


/**
 * Creates a sink retrieving the first item of the feed.
 *
 * Consumption stops at the first item, leaving the rest of the feed unconsumed; the first item meeting a condition is
 * retrieved by drawing from a `filter()` upstream.
 *
 * An empty feed resolves to `undefined`; callers wanting a default supply it with `??`, and those requiring a value
 * reach for {@link seek} instead.
 *
 * > [!NOTE]
 * >
 * > - **Incremental**: a single item is drawn, so an infinite feed completes.
 * > - **Streaming**: the item is handed back as it is drawn, none retained.
 * > - **Stateless**: the outcome rests on the first item alone.
 *
 * @typeParam V The type of items in the feed
 *
 * @returns A sink resolving to the first item of the feed, or to `undefined` if the feed carries none
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items([1, 2, 3, 4, 5]))
 *   (find())
 * );  // 1
 *
 * await pipe(
 *   (items([1, 2, 3, 4, 5]))
 *   (filter(n => n > 3))
 *   (find())
 * );  // 4
 * ```
 */
export function find<V>(): Sink<V, Optional<V>> {

	return async source => {

		const iterator = source[Symbol.asyncIterator]();

		try {

			const { done, value } = await iterator.next();

			return done ? undefined : value;

		} finally { // leave the rest of the feed unconsumed

			await iterator.return?.();

		}

	};

}
