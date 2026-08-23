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

import { isNumber } from "@metreeca/core";
import type { Awaitable } from "@metreeca/core/async";
import { Data, Task } from "../index.js";
import { flatten } from "../index.core.js";
import { cores, parallelize } from "./index.core.js";


/**
 * Creates a task that transforms each item into a data source and flattens the results.
 *
 * Items are processed sequentially by default, preserving output order. In parallel mode,
 * items are processed concurrently and flattened results are emitted as they complete without preserving order.
 *
 * Data sources returned by the mapper are handled as follows:
 *
 * - `undefined` - filtered out and not included in the output stream
 * - **Primitives** (strings, numbers, booleans, null): Yielded as single atomic items
 * - **Arrays/Iterables** (excluding strings): Items are yielded individually from each mapper result
 * - **Async Iterables/Pipes**: Items are yielded as they become available
 * - **Promises and other thenables**: Awaited and then processed according to their resolved value
 * - **Other values** (objects, etc.): Yielded as single items
 *
 * The mapper may return its data source either directly or as a promise: asynchronous mappers are useful for data
 * retrieved from APIs, databases, or any other asynchronous source.
 *
 * > [!NOTE]
 * >
 * > In parallel mode, when an error occurs all pending operations are awaited (but not failed) before the error is
 * > thrown to prevent resource leaks.
 *
 * @typeParam V The type of input items
 * @typeParam R The type of output items after flattening
 *
 * @param mapper The possibly asynchronous function to transform each item into a data source. When the mapper returns
 *   `undefined`, that value is filtered out and not included in the output stream.
 * @param parallel Concurrency control: `false`/`undefined`/`1` for sequential (default),
 *   `true` for parallel with auto-detected concurrency (CPU cores), `0` for unbounded concurrency (I/O-heavy tasks),
 *   or a number > 1 for explicit concurrency limit
 *
 * @returns A task that transforms and flattens items
 *
 * @example
 *
 * ```typescript
 * // Synchronous mapper
 * await items([1, 2, 3])(flatMap(x => [x, x * 2]))(toArray());
 * // [1, 2, 2, 4, 3, 6]
 *
 * // Async mapper for API calls
 * await items([1, 2, 3])(flatMap(async id => {
 *   const response = await fetch(`/api/items/${id}`);
 *   return response.json();
 * }))(toArray());
 *
 * // Parallel processing
 * await items([1, 2, 3])(flatMap(async id => {
 *   const data = await fetchData(id);
 *   return data.items;
 * }, { parallel: true }))(toArray());
 * ```
 */
export function flatMap<V, R>(
	mapper: (item: V) => Awaitable<undefined | Data<R>>,
	{ parallel }: { parallel?: boolean | number } = {}
): Task<V, R> {

	if ( parallel === true || isNumber(parallel) && parallel !== 1 ) {

		const concurrency = parallel === true ? cores
			: parallel === 0 ? Infinity
				: parallel;

		return source => parallelize(
			source,
			item => Promise.resolve(mapper(item)),
			concurrency,
			flatten
		);

	} else {

		return async function* (source: AsyncIterable<V>) {
			for await (const item of source) {
				yield* flatten(await mapper(item));
			}
		};

	}

}
