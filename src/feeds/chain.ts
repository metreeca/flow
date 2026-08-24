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
 * Creates a pipe concatenating multiple data sources.
 *
 * Sources are consumed one at a time, each fully drained before the next is opened, so items are emitted in source
 * order and a source that never runs dry starves the ones behind it. A promised source is awaited when its turn
 * comes, deferring retrieval until then.
 *
 * @typeParam V The type of items in the streams
 *
 * @param sources The data sources to concatenate, each supplied either directly or as a promise
 *
 * @returns A pipe yielding the items of all sources in source order
 *
 * @example
 *
 * ```typescript
 * await pipe(
 *   (chain(items([1, 2]), items([3, 4])))
 *   (toArray())
 * );  // [1, 2, 3, 4]
 * ```
 */
export function chain<V>(...sources: readonly Awaitable<Data<V>>[]): Pipe<V> {

	return items((async function* () {

		for (const source of sources) {
			yield* flatten(await source);
		}

	})());

}
