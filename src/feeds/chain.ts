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
 * Chains multiple data sources into a single stream, preserving source order.
 *
 * Items are emitted in source order: all items from the first source,
 * then all items from the second source, and so on.
 * Each source is fully consumed before moving to the next.
 *
 * @typeParam V The type of items in the streams
 *
 * @param sources The data sources to chain, each supplied either directly or as a promise
 *
 * @returns A pipe containing all items from all sources in order
 *
 * @example
 *
 * ```typescript
 * await chain(items([1, 2]), items([3, 4]))(toArray());  // [1, 2, 3, 4]
 * ```
 */
export function chain<V>(...sources: readonly Awaitable<Data<V>>[]): Pipe<V> {

	return items((async function* () {

		for (const source of sources) {
			yield* flatten(await source);
		}

	})());

}
