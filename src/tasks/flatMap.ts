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
import { Data, Task } from "../index.js";
import { flatten } from "../index.core.js";


/**
 * Creates a task expanding each item into a data source.
 *
 * Each item is converted into a {@link index.Data Data} value and replaced in the stream by the items that value
 * contributes, according to its shape; conversion is lazy, one item at a time, and expansions are emitted in source
 * order. An item expanding to nothing simply drops out of the stream.
 *
 * @typeParam V The type of input items
 * @typeParam R The type of output items
 *
 * @param mapper The function converting each item into the data source replacing it
 *
 * @returns A task yielding the items contributed by the expansion of each source item
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (items(1, 2, 3))
 *   (flatMap(n => [n, n*2]))
 *   (toArray())
 * );  // [1, 2, 2, 4, 3, 6]
 * ```
 */
export function flatMap<V, R>(mapper: (item: V) => Awaitable<undefined | Data<R>>): Task<V, R> {

	return async function* (source: AsyncIterable<V>) {
		for await (const item of source) {
			yield* flatten(await mapper(item));
		}
	};

}
